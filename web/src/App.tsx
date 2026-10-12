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
import { generatePayoutCsv, type PayoutSubmission } from "./lib/payoutCsv";
import { I18nProvider, useI18n } from "./i18n/I18nContext";
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

export function AppContent() {
  const { lang, setLang, t } = useI18n();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOps, setIsOps] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
      setGlobalError(mapFirebaseError(err, t));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loadingAuth) {
    return <div className="container"><p>{t("app.loading")}</p></div>;
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{t("app.title")}</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {t("app.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {/* Language Toggle (R5.1) */}
          <div style={{ display: "flex", background: "#e2e8f0", borderRadius: "6px", padding: "2px" }}>
            <button
              className="btn"
              style={{
                padding: "0.25rem 0.6rem",
                fontSize: "0.8rem",
                background: lang === "en" ? "var(--primary)" : "transparent",
                color: lang === "en" ? "#fff" : "#334155",
              }}
              onClick={() => setLang("en")}
            >
              EN
            </button>
            <button
              className="btn"
              style={{
                padding: "0.25rem 0.6rem",
                fontSize: "0.8rem",
                background: lang === "th" ? "var(--primary)" : "transparent",
                color: lang === "th" ? "#fff" : "#334155",
              }}
              onClick={() => setLang("th")}
            >
              TH
            </button>
          </div>

          {currentUser && (
            <>
              <span>
                <strong>{currentUser.email}</strong> ({isOps ? t("auth.roleOps") : t("auth.roleCreator")})
              </span>
              <button className="btn btn-secondary" onClick={handleLogout}>
                {t("app.signOut")}
              </button>
            </>
          )}
        </div>
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

export function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

function LoginScreen({ onLogin }: { onLogin: (email: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="card">
      <h2>{t("auth.title")}</h2>
      <p style={{ color: "var(--text-muted)" }}>
        {t("auth.subtitle")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "320px", marginTop: "1rem" }}>
        <button className="btn" onClick={() => onLogin("ops@example.com")}>
          {t("auth.loginOps")}
        </button>
        <button className="btn btn-secondary" onClick={() => onLogin("a@example.com")}>
          {t("auth.loginCreatorA")}
        </button>
        <button className="btn btn-secondary" onClick={() => onLogin("b@example.com")}>
          {t("auth.loginCreatorB")}
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
  const { t } = useI18n();
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

      const campSnap = await getDocs(collection(db, "campaigns"));
      const camps = campSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
      setCampaigns(camps);
      if (camps.length && !selectedCampaign) {
        setSelectedCampaign(camps[0].id);
      }

      const subQuery = query(
        collection(db, "submissions"),
        where("creatorId", "==", user.uid)
      );
      const subSnap = await getDocs(subQuery);
      const subs = subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
      setSubmissions(subs);
    } catch (err) {
      onError(mapFirebaseError(err, t));
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

    const valResult = validateTiktokUrl(tiktokUrl, t);
    if (!valResult.valid) {
      setUrlValidationError(valResult.error!);
      return;
    }

    try {
      setSubmitting(true);
      const newSubId = `sub_${Date.now()}`;
      const subRef = doc(db, "submissions", newSubId);

      await setDoc(subRef, {
        campaignId: selectedCampaign,
        creatorId: user.uid,
        tiktokUrl: tiktokUrl.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setTiktokUrl("");
      onSuccess(t("creator.successSubmit"));
      await fetchData();
    } catch (err) {
      onError(mapFirebaseError(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>{t("creator.submitTitle")}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label>{t("creator.campaignLabel")}</label>
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
            <label>{t("creator.tiktokUrlLabel")}</label>
            <input
              type="text"
              className="input"
              placeholder={t("creator.tiktokUrlPlaceholder")}
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
            {submitting ? t("creator.submittingButton") : t("creator.submitButton")}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>{t("creator.mySubmissionsTitle")}</h2>
        {loading ? (
          <p>{t("creator.loadingSubmissions")}</p>
        ) : submissions.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>{t("creator.noSubmissions")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("creator.colId")}</th>
                <th>{t("creator.colCampaign")}</th>
                <th>{t("creator.colUrl")}</th>
                <th>{t("creator.colStatus")}</th>
                <th>{t("creator.colReason")}</th>
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
                    <span className={`badge badge-${s.status}`}>
                      {t(`status.${s.status}`)}
                    </span>
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
  const { t } = useI18n();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [exportMonth, setExportMonth] = useState<string>("2026-09");

  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectReasonError, setRejectReasonError] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      onError(null);
      setLoading(true);

      const campSnap = await getDocs(collection(db, "campaigns"));
      const loadedCamps = campSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
      setCampaigns(loadedCamps);

      const subSnap = await getDocs(collection(db, "submissions"));
      setSubmissions(subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission)));
    } catch (err) {
      onError(mapFirebaseError(err, t));
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
        onSuccess(t("ops.approvedSuccess", { id: sub.id }));
      } else {
        onSuccess(t("ops.alreadyApproved", { id: sub.id }));
      }
      await fetchQueue();
    } catch (err) {
      onError(mapFirebaseError(err, t));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingSubId) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectReasonError(t("ops.rejectReasonRequired"));
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
        onSuccess(t("ops.rejectedSuccess", { id: rejectingSubId }));
      } else {
        onSuccess(t("ops.alreadyRejected", { id: rejectingSubId }));
      }
      setRejectingSubId(null);
      setRejectReason("");
      await fetchQueue();
    } catch (err) {
      onError(mapFirebaseError(err, t));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExportCsv = () => {
    const campaignMap = new Map<string, Campaign>();
    campaigns.forEach((c) => campaignMap.set(c.id, c));

    const payoutData: PayoutSubmission[] = submissions.map((s) => {
      const camp = campaignMap.get(s.campaignId);
      return {
        id: s.id,
        creatorId: s.creatorId,
        campaignId: s.campaignId,
        campaignTitle: camp?.title || s.campaignId,
        tiktokUrl: s.tiktokUrl,
        status: s.status,
        createdAt: s.createdAt,
        ratePerVideoTHB: camp?.ratePerVideoTHB || 0,
      };
    });

    const { csvString, rowCount, totalTHB } = generatePayoutCsv(payoutData, exportMonth);

    if (rowCount === 0) {
      onError(t("ops.noApprovedInMonth", { month: exportMonth }));
      return;
    }

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payout-${exportMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onSuccess(t("ops.exportSuccess", { count: rowCount, month: exportMonth, total: totalTHB }));
  };

  const filteredSubmissions = submissions.filter((s) => {
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesCamp = campaignFilter === "all" || s.campaignId === campaignFilter;
    return matchesStatus && matchesCamp;
  });

  return (
    <div>
      {/* Payout Export Card */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: "0 0 0.25rem 0" }}>{t("ops.exportTitle")}</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {t("ops.exportDesc")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="month"
            className="input"
            style={{ width: "auto", margin: 0 }}
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
          />
          <button className="btn" onClick={handleExportCsv}>
            {t("ops.btnExport")}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>{t("ops.queueTitle")}</h2>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>{t("ops.filterStatusLabel")}</label>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("ops.allStatuses")}</option>
              <option value="pending">{t("status.pending")}</option>
              <option value="approved">{t("status.approved")}</option>
              <option value="rejected">{t("status.rejected")}</option>
              <option value="paid">{t("status.paid")}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>{t("ops.filterCampaignLabel")}</label>
            <select
              className="select"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
            >
              <option value="all">{t("ops.allCampaigns")}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p>{t("ops.loadingQueue")}</p>
        ) : filteredSubmissions.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>{t("ops.noQueueMatches")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("ops.colId")}</th>
                <th>{t("ops.colCampaign")}</th>
                <th>{t("ops.colCreator")}</th>
                <th>{t("ops.colUrl")}</th>
                <th>{t("ops.colStatus")}</th>
                <th>{t("ops.colActions")}</th>
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
                      <span className={`badge badge-${s.status}`}>{t(`status.${s.status}`)}</span>
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
                            {t("ops.btnApprove")}
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
                            {t("ops.btnReject")}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t("ops.actionNone")}</span>
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
            <h3>{t("ops.rejectModalTitle")}</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              {t("ops.rejectModalDesc", { id: rejectingSubId })}
            </p>
            <textarea
              rows={3}
              className="input"
              value={rejectReason}
              placeholder={t("ops.rejectReasonPlaceholder")}
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
                {t("ops.btnCancel")}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmReject}
                disabled={actionLoadingId !== null}
              >
                {t("ops.btnConfirmReject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
