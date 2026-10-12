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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">{t("app.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">N</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                {t("app.title")}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {t("app.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Language Switcher */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  lang === "en"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setLang("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  lang === "th"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setLang("th")}
              >
                TH
              </button>
            </div>

            {currentUser && (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800">{currentUser.email}</div>
                  <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {isOps ? t("auth.roleOps") : t("auth.roleCreator")}
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
                  onClick={handleLogout}
                >
                  {t("app.signOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Global Notifications */}
        {globalError && (
          <div
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 shadow-xs"
            role="alert"
          >
            <span className="text-red-500 font-bold">✕</span>
            <div className="flex-1 font-medium">{globalError}</div>
          </div>
        )}
        {globalSuccess && (
          <div
            className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3 shadow-xs"
            role="status"
          >
            <span className="text-emerald-500 font-bold">✓</span>
            <div className="flex-1 font-medium">{globalSuccess}</div>
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
      </main>
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

  const accounts = [
    { email: "ops@nex.test", label: t("auth.loginOps"), role: "Operations Staff", color: "border-indigo-500 hover:bg-indigo-50/50" },
    { email: "creator1@nex.test", label: t("auth.loginCreatorA"), role: "Creator Account 1", color: "border-emerald-500 hover:bg-emerald-50/50" },
    { email: "creator2@nex.test", label: t("auth.loginCreatorB"), role: "Creator Account 2", color: "border-sky-500 hover:bg-sky-50/50" },
  ];

  return (
    <div className="max-w-md mx-auto mt-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t("auth.title")}</h2>
        <p className="text-sm text-slate-500 mt-1">{t("auth.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {accounts.map((acc) => (
          <button
            key={acc.email}
            type="button"
            className={`w-full p-4 text-left border rounded-xl transition-all flex items-center justify-between group cursor-pointer ${acc.color}`}
            onClick={() => onLogin(acc.email)}
          >
            <div>
              <div className="font-semibold text-slate-900 text-sm">{acc.label}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{acc.email}</div>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              Login →
            </span>
          </button>
        ))}
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
    <div className="space-y-8">
      {/* Submission Form Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-4">
          {t("creator.submitTitle")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {t("creator.campaignLabel")}
            </label>
            <select
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition-all disabled:opacity-50"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {t("creator.tiktokUrlLabel")}
            </label>
            <input
              type="text"
              className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl shadow-2xs outline-hidden transition-all ${
                urlValidationError
                  ? "border-red-400 focus:ring-2 focus:ring-red-400"
                  : "border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              } disabled:opacity-50`}
              placeholder={t("creator.tiktokUrlPlaceholder")}
              value={tiktokUrl}
              onChange={(e) => {
                setTiktokUrl(e.target.value);
                setUrlValidationError(null);
              }}
              disabled={submitting}
            />
            {urlValidationError && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">
                {urlValidationError}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? t("creator.submittingButton") : t("creator.submitButton")}
          </button>
        </form>
      </div>

      {/* Creator Submissions Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {t("creator.mySubmissionsTitle")}
          </h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            Total: {submissions.length}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {t("creator.loadingSubmissions")}
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            {t("creator.noSubmissions")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">{t("creator.colId")}</th>
                  <th className="px-6 py-3.5">{t("creator.colCampaign")}</th>
                  <th className="px-6 py-3.5">{t("creator.colUrl")}</th>
                  <th className="px-6 py-3.5">{t("creator.colStatus")}</th>
                  <th className="px-6 py-3.5">{t("creator.colReason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{s.campaignId}</td>
                    <td className="px-6 py-4">
                      <a
                        href={s.tiktokUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 underline truncate block max-w-xs"
                      >
                        {s.tiktokUrl}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={s.status} label={t(`status.${s.status}`)} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {s.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    <div className="space-y-6">
      {/* Payout Export Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {t("ops.exportTitle")}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("ops.exportDesc")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            className="px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
          />
          <button
            type="button"
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            onClick={handleExportCsv}
          >
            {t("ops.btnExport")}
          </button>
        </div>
      </div>

      {/* Review Queue Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {t("ops.queueTitle")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and audit creator video submissions
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                {t("ops.filterStatusLabel")}
              </label>
              <select
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
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
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                {t("ops.filterCampaignLabel")}
              </label>
              <select
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
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
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {t("ops.loadingQueue")}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            {t("ops.noQueueMatches")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">{t("ops.colId")}</th>
                  <th className="px-6 py-3.5">{t("ops.colCampaign")}</th>
                  <th className="px-6 py-3.5">{t("ops.colCreator")}</th>
                  <th className="px-6 py-3.5">{t("ops.colUrl")}</th>
                  <th className="px-6 py-3.5">{t("ops.colStatus")}</th>
                  <th className="px-6 py-3.5 text-right">{t("ops.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((s) => {
                  const isItemLoading = actionLoadingId === s.id;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{s.campaignId}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-600">{s.creatorId}</td>
                      <td className="px-6 py-4">
                        <a
                          href={s.tiktokUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 underline truncate block max-w-xs text-xs"
                        >
                          {s.tiktokUrl}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={s.status} label={t(`status.${s.status}`)} />
                        {s.reason && (
                          <div className="text-[11px] text-slate-500 mt-1 italic">
                            "{s.reason}"
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {s.status === "pending" ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                              disabled={isItemLoading}
                              onClick={() => handleApprove(s)}
                            >
                              {t("ops.btnApprove")}
                            </button>
                            <button
                              type="button"
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
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
                          <span className="text-xs text-slate-400 font-medium">
                            {t("ops.actionNone")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingSubId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {t("ops.rejectModalTitle")}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {t("ops.rejectModalDesc", { id: rejectingSubId })}
            </p>
            <div className="mt-4">
              <textarea
                rows={3}
                className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-red-500 outline-hidden"
                value={rejectReason}
                placeholder={t("ops.rejectReasonPlaceholder")}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  setRejectReasonError(null);
                }}
              />
              {rejectReasonError && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">
                  {rejectReasonError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                onClick={() => setRejectingSubId(null)}
                disabled={actionLoadingId !== null}
              >
                {t("ops.btnCancel")}
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer"
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

function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    paid: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

export default App;
