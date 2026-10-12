import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./lib/firebase";
import { validateTiktokUrl } from "./lib/validation";
import { mapFirebaseError } from "./lib/errorMapping";
import "./App.css";

interface Campaign {
  id: string;
  title: string;
  status: "open" | "closed";
  ratePerVideoTHB: number;
}

interface Submission {
  id: string;
  campaignId: string;
  creatorId: string;
  tiktokUrl: string;
  status: "pending" | "approved" | "rejected" | "paid";
  reason?: string;
  createdAt?: any;
}

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOps, setIsOps] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Force refresh token to ensure ops claim is loaded (D2)
        const idTokenResult = await user.getIdTokenResult(true);
        setCurrentUser(user);
        setIsOps(idTokenResult.claims.ops === true);
      } else {
        setCurrentUser(null);
        setIsOps(false);
      }
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async (email: string) => {
    try {
      setGlobalError(null);
      await signInWithEmailAndPassword(auth, email, "password123");
    } catch (err) {
      setGlobalError(mapFirebaseError(err));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loadingAuth) {
    return <div className="container"><p>Loading application state...</p></div>;
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Nex Submission Review</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Technical Test — Local Emulators Only
          </p>
        </div>
        {currentUser && (
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span>
              <strong>{currentUser.email}</strong> ({isOps ? "Ops" : "Creator"})
            </span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        )}
      </header>

      {globalError && (
        <div className="alert-error" role="alert">
          {globalError}
        </div>
      )}
      {globalSuccess && (
        <div className="alert-success" role="status">
          {globalSuccess}
        </div>
      )}

      {!currentUser ? (
        <LoginScreen onLogin={handleLogin} />
      ) : isOps ? (
        <OpsScreen
          onError={(msg) => setGlobalError(msg)}
          onSuccess={(msg) => {
            setGlobalSuccess(msg);
            setTimeout(() => setGlobalSuccess(null), 3000);
          }}
        />
      ) : (
        <CreatorScreen
          user={currentUser}
          onError={(msg) => setGlobalError(msg)}
          onSuccess={(msg) => {
            setGlobalSuccess(msg);
            setTimeout(() => setGlobalSuccess(null), 3000);
          }}
        />
      )}
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (email: string) => void }) {
  return (
    <div className="card">
      <h2>Sign In with Seed Account</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Select a seed user to test authorization and views:
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "320px", marginTop: "1rem" }}>
        <button className="btn" onClick={() => onLogin("ops@example.com")}>
          Login as Ops (ops@example.com)
        </button>
        <button className="btn btn-secondary" onClick={() => onLogin("a@example.com")}>
          Login as Creator A (a@example.com)
        </button>
        <button className="btn btn-secondary" onClick={() => onLogin("b@example.com")}>
          Login as Creator B (b@example.com)
        </button>
      </div>
    </div>
  );
}

function CreatorScreen({
  user,
  onError,
  onSuccess,
}: {
  user: User;
  onError: (msg: string | null) => void;
  onSuccess: (msg: string) => void;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      onError(null);
      setLoading(true);

      // Fetch open campaigns
      const campSnap = await getDocs(collection(db, "campaigns"));
      const camps = campSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
      setCampaigns(camps);
      if (camps.length && !selectedCampaign) {
        setSelectedCampaign(camps[0].id);
      }

      // Fetch ONLY own submissions (R1.2 rules requirement: creatorId == auth.uid)
      const subQuery = query(
        collection(db, "submissions"),
        where("creatorId", "==", user.uid)
      );
      const subSnap = await getDocs(subQuery);
      const subs = subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
      setSubmissions(subs);
    } catch (err) {
      onError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlValidationError(null);
    onError(null);

    // Client-side validation (UX)
    const valResult = validateTiktokUrl(tiktokUrl);
    if (!valResult.valid) {
      setUrlValidationError(valResult.error!);
      return;
    }

    try {
      setSubmitting(true);
      // Unique submission ID
      const newSubId = `sub_${Date.now()}`;
      const subRef = doc(db, "submissions", newSubId);

      // Must strictly match rules keys whitelist & values (R1.3)
      await setDoc(subRef, {
        campaignId: selectedCampaign,
        creatorId: user.uid,
        tiktokUrl: tiktokUrl.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setTiktokUrl("");
      onSuccess("Submission created successfully!");
      await fetchData();
    } catch (err) {
      onError(mapFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Submit TikTok Video</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label>Campaign</label>
            <select
              className="select"
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              disabled={submitting}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.status}) — {c.ratePerVideoTHB} THB
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>TikTok URL</label>
            <input
              type="text"
              className="input"
              placeholder="https://www.tiktok.com/@creator/video/123... or https://vm.tiktok.com/..."
              value={tiktokUrl}
              onChange={(e) => {
                setTiktokUrl(e.target.value);
                setUrlValidationError(null);
              }}
              disabled={submitting}
            />
            {urlValidationError && (
              <span style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.25rem", display: "block" }}>
                {urlValidationError}
              </span>
            )}
          </div>

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Video"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>My Submissions</h2>
        {loading ? (
          <p>Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No submissions found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Campaign</th>
                <th>TikTok URL</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.campaignId}</td>
                  <td>
                    <a href={s.tiktokUrl} target="_blank" rel="noreferrer">
                      {s.tiktokUrl.length > 35 ? s.tiktokUrl.substring(0, 35) + "..." : s.tiktokUrl}
                    </a>
                  </td>
                  <td>
                    <span className={`badge badge-${s.status}`}>{s.status}</span>
                  </td>
                  <td>{s.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function OpsScreen({
  onError,
  onSuccess,
}: {
  onError: (msg: string | null) => void;
  onSuccess: (msg: string) => void;
}) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  // Reject modal state
  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectReasonError, setRejectReasonError] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      onError(null);
      setLoading(true);

      const campSnap = await getDocs(collection(db, "campaigns"));
      setCampaigns(campSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign)));

      // Ops can read all submissions (R1.5)
      const subSnap = await getDocs(collection(db, "submissions"));
      setSubmissions(subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission)));
    } catch (err) {
      onError(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (sub: Submission) => {
    try {
      onError(null);
      setActionLoadingId(sub.id);
      const reviewFn = httpsCallable<any, { ok: boolean; changed: boolean; status: string }>(
        functions,
        "reviewSubmission"
      );
      const res = await reviewFn({ id: sub.id, decision: "approved" });
      if (res.data.changed) {
        onSuccess(`Submission ${sub.id} approved!`);
      } else {
        onSuccess(`Submission ${sub.id} was already approved (no change).`);
      }
      await fetchQueue();
    } catch (err) {
      onError(mapFirebaseError(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingSubId) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectReasonError("Rejection reason is required");
      return;
    }

    try {
      onError(null);
      setActionLoadingId(rejectingSubId);
      const reviewFn = httpsCallable<any, { ok: boolean; changed: boolean; status: string }>(
        functions,
        "reviewSubmission"
      );
      const res = await reviewFn({
        id: rejectingSubId,
        decision: "rejected",
        reason: trimmed,
      });

      if (res.data.changed) {
        onSuccess(`Submission ${rejectingSubId} rejected.`);
      } else {
        onSuccess(`Submission ${rejectingSubId} was already rejected (no change).`);
      }
      setRejectingSubId(null);
      setRejectReason("");
      await fetchQueue();
    } catch (err) {
      onError(mapFirebaseError(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter items in memory
  const filteredSubmissions = submissions.filter((s) => {
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesCamp = campaignFilter === "all" || s.campaignId === campaignFilter;
    return matchesStatus && matchesCamp;
  });

  return (
    <div>
      <div className="card">
        <h2>Ops Review Queue</h2>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Filter Status</label>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Filter Campaign</label>
            <select
              className="select"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p>Loading queue...</p>
        ) : filteredSubmissions.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No submissions match the selected filters.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Campaign</th>
                <th>Creator</th>
                <th>TikTok URL</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((s) => {
                const isItemLoading = actionLoadingId === s.id;
                return (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.campaignId}</td>
                    <td>{s.creatorId}</td>
                    <td>
                      <a href={s.tiktokUrl} target="_blank" rel="noreferrer">
                        {s.tiktokUrl.length > 25 ? s.tiktokUrl.substring(0, 25) + "..." : s.tiktokUrl}
                      </a>
                    </td>
                    <td>
                      <span className={`badge badge-${s.status}`}>{s.status}</span>
                      {s.reason && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          {s.reason}
                        </div>
                      )}
                    </td>
                    <td>
                      {s.status === "pending" ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-success"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                            disabled={isItemLoading}
                            onClick={() => handleApprove(s)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                            disabled={isItemLoading}
                            onClick={() => {
                              setRejectingSubId(s.id);
                              setRejectReason("");
                              setRejectReasonError(null);
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {rejectingSubId && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Reject Submission</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Please provide a clear reason for rejecting submission <strong>{rejectingSubId}</strong> (required):
            </p>
            <textarea
              rows={3}
              className="input"
              value={rejectReason}
              placeholder="e.g. Video quality too low or missing campaign hashtag"
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectReasonError(null);
              }}
            />
            {rejectReasonError && (
              <span style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.25rem", display: "block" }}>
                {rejectReasonError}
              </span>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setRejectingSubId(null)}
                disabled={actionLoadingId !== null}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmReject}
                disabled={actionLoadingId !== null}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
