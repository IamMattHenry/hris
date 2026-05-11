"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { dueProcessApi } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import ActionButton from "@/components/buttons/ActionButton";
import { Eye, RefreshCcw } from "lucide-react";

const DEFAULT_POLICY_TEXT = "{\n  \"version\": 1\n}";

type TabKey = "violations" | "cases" | "policy";

export default function DueProcessPage() {
  const { canAny } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabKey>("violations");

  const [violations, setViolations] = useState<any[]>([]);
  const [violationsCount, setViolationsCount] = useState(0);
  const [violationsLoading, setViolationsLoading] = useState(false);

  const [cases, setCases] = useState<any[]>([]);
  const [casesCount, setCasesCount] = useState(0);
  const [casesLoading, setCasesLoading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [caseDetail, setCaseDetail] = useState<any | null>(null);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);

  const [policyText, setPolicyText] = useState(DEFAULT_POLICY_TEXT);
  const [policyLoading, setPolicyLoading] = useState(false);

  const [manualViolation, setManualViolation] = useState({
    employee_id: "",
    violation_type: "late",
    violation_date: "",
    violation_minutes: "",
    remarks: "",
  });

  const [scanRange, setScanRange] = useState({
    start_date: "",
    end_date: "",
  });

  const [noticeDraft, setNoticeDraft] = useState({
    notice_type: "NTE",
    subject: "",
    content: "",
    due_date: "",
    sent_via: "internal",
    send_now: false,
  });

  const [hearingDraft, setHearingDraft] = useState({
    hearing_datetime: "",
    hearing_type: "face_to_face",
    location_or_link: "",
    investigator_id: "",
    notes: "",
    send_notice: true,
  });

  const [decisionDraft, setDecisionDraft] = useState({
    decision_type: "written_warning",
    penalty_days: "",
    effective_date: "",
    decision_summary: "",
    send_notice: true,
  });

  const canManage = canAny("due_process.manage", "due_process.notice_send", "due_process.hearing_schedule", "due_process.decision_issue");

  const fetchViolations = useCallback(async () => {
    setViolationsLoading(true);
    const result = await dueProcessApi.getViolations({ limit: 50, page: 1 });
    if (!result.success) {
      toast.error(result.message || "Failed to load violations");
      setViolations([]);
      setViolationsCount(0);
      setViolationsLoading(false);
      return;
    }
    setViolations(result.data || []);
    setViolationsCount(Number((result as any).count || 0));
    setViolationsLoading(false);
  }, []);

  const fetchCases = useCallback(async () => {
    setCasesLoading(true);
    const result = await dueProcessApi.getCases({ limit: 50, page: 1 });
    if (!result.success) {
      toast.error(result.message || "Failed to load cases");
      setCases([]);
      setCasesCount(0);
      setCasesLoading(false);
      return;
    }
    setCases(result.data || []);
    setCasesCount(Number((result as any).count || 0));
    setCasesLoading(false);
  }, []);

  const fetchCaseDetail = useCallback(async (caseId: number) => {
    setCaseDetailLoading(true);
    const result = await dueProcessApi.getCaseById(caseId);
    if (!result.success) {
      toast.error(result.message || "Failed to load case detail");
      setCaseDetail(null);
      setCaseDetailLoading(false);
      return;
    }
    setCaseDetail(result.data || null);
    setCaseDetailLoading(false);
  }, []);

  const fetchPolicy = useCallback(async () => {
    setPolicyLoading(true);
    const result = await dueProcessApi.getPolicy();
    if (!result.success) {
      toast.error(result.message || "Failed to load policy");
      setPolicyText(DEFAULT_POLICY_TEXT);
      setPolicyLoading(false);
      return;
    }
    setPolicyText(JSON.stringify(result.data || {}, null, 2));
    setPolicyLoading(false);
  }, []);

  useEffect(() => {
    fetchViolations();
    fetchCases();
    fetchPolicy();
  }, [fetchViolations, fetchCases, fetchPolicy]);

  useEffect(() => {
    if (selectedCaseId) {
      fetchCaseDetail(selectedCaseId);
    } else {
      setCaseDetail(null);
    }
  }, [selectedCaseId, fetchCaseDetail]);

  const handleCreateViolation = async () => {
    if (!manualViolation.employee_id || !manualViolation.violation_date) {
      toast.error("Employee ID and violation date are required");
      return;
    }

    const result = await dueProcessApi.createViolation({
      employee_id: Number(manualViolation.employee_id),
      violation_type: manualViolation.violation_type,
      violation_date: manualViolation.violation_date,
      violation_minutes: manualViolation.violation_minutes
        ? Number(manualViolation.violation_minutes)
        : null,
      remarks: manualViolation.remarks || null,
    });

    if (!result.success) {
      toast.error(result.message || "Failed to create violation");
      return;
    }

    toast.success("Violation created");
    setManualViolation({
      employee_id: "",
      violation_type: "late",
      violation_date: "",
      violation_minutes: "",
      remarks: "",
    });
    fetchViolations();
  };

  const handleScan = async () => {
    if (!scanRange.start_date || !scanRange.end_date) {
      toast.error("Provide start and end dates");
      return;
    }

    const result = await dueProcessApi.scanViolations(scanRange);
    if (!result.success) {
      toast.error(result.message || "Scan failed");
      return;
    }

    toast.success("Scan completed");
    fetchViolations();
  };

  const handleUpdateViolationStatus = async (id: number, status: string) => {
    const result = await dueProcessApi.updateViolationStatus(id, { status });
    if (!result.success) {
      toast.error(result.message || "Failed to update status");
      return;
    }
    toast.success("Status updated");
    fetchViolations();
  };

  const handleCreateNotice = async () => {
    if (!selectedCaseId) {
      toast.error("Select a case first");
      return;
    }
    if (!noticeDraft.subject || !noticeDraft.content) {
      toast.error("Notice subject and content are required");
      return;
    }

    const result = await dueProcessApi.createNotice(selectedCaseId, {
      notice_type: noticeDraft.notice_type,
      subject: noticeDraft.subject,
      content: noticeDraft.content,
      sent_via: noticeDraft.sent_via as any,
      due_date: noticeDraft.due_date || null,
      send_now: noticeDraft.send_now,
    });

    if (!result.success) {
      toast.error(result.message || "Failed to create notice");
      return;
    }

    toast.success("Notice created");
    setNoticeDraft({
      notice_type: "NTE",
      subject: "",
      content: "",
      due_date: "",
      sent_via: "internal",
      send_now: false,
    });
    fetchCaseDetail(selectedCaseId);
  };

  const handleSendNotice = async (noticeId: number) => {
    const result = await dueProcessApi.sendNotice(noticeId);
    if (!result.success) {
      toast.error(result.message || "Failed to send notice");
      return;
    }
    toast.success("Notice sent");
    if (selectedCaseId) fetchCaseDetail(selectedCaseId);
  };

  const handleScheduleHearing = async () => {
    if (!selectedCaseId) {
      toast.error("Select a case first");
      return;
    }

    if (!hearingDraft.hearing_datetime) {
      toast.error("Hearing date/time is required");
      return;
    }

    const result = await dueProcessApi.scheduleHearing(selectedCaseId, {
      hearing_datetime: hearingDraft.hearing_datetime,
      hearing_type: hearingDraft.hearing_type as any,
      location_or_link: hearingDraft.location_or_link || null,
      investigator_id: hearingDraft.investigator_id ? Number(hearingDraft.investigator_id) : null,
      notes: hearingDraft.notes || null,
      send_notice: hearingDraft.send_notice,
    });

    if (!result.success) {
      toast.error(result.message || "Failed to schedule hearing");
      return;
    }

    toast.success("Hearing scheduled");
    setHearingDraft({
      hearing_datetime: "",
      hearing_type: "face_to_face",
      location_or_link: "",
      investigator_id: "",
      notes: "",
      send_notice: true,
    });
    fetchCaseDetail(selectedCaseId);
  };

  const handleIssueDecision = async () => {
    if (!selectedCaseId) {
      toast.error("Select a case first");
      return;
    }

    if (!decisionDraft.decision_type) {
      toast.error("Decision type is required");
      return;
    }

    const result = await dueProcessApi.issueDecision(selectedCaseId, {
      decision_type: decisionDraft.decision_type,
      penalty_days: decisionDraft.penalty_days ? Number(decisionDraft.penalty_days) : null,
      effective_date: decisionDraft.effective_date || null,
      decision_summary: decisionDraft.decision_summary || null,
      send_notice: decisionDraft.send_notice,
    });

    if (!result.success) {
      toast.error(result.message || "Failed to issue decision");
      return;
    }

    toast.success("Decision issued");
    setDecisionDraft({
      decision_type: "written_warning",
      penalty_days: "",
      effective_date: "",
      decision_summary: "",
      send_notice: true,
    });
    fetchCaseDetail(selectedCaseId);
  };

  const handleSavePolicy = async () => {
    let payload = null;
    try {
      payload = JSON.parse(policyText);
    } catch (error) {
      toast.error("Policy JSON is invalid");
      return;
    }

    const result = await dueProcessApi.updatePolicy(payload);
    if (!result.success) {
      toast.error(result.message || "Failed to update policy");
      return;
    }

    toast.success("Policy updated");
    setPolicyText(JSON.stringify(result.data || payload, null, 2));
  };

  const violationSummary = useMemo(() => {
    const pending = violations.filter((v) => v.status === "pending").length;
    const escalated = violations.filter((v) => v.status === "escalated").length;
    return { pending, escalated };
  }, [violations]);

  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-[#3b2b1c] font-poppins">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance Violations & Due Process</h1>
          <p className="text-sm text-gray-600">Monitor violations, manage due process cases, and maintain compliance.</p>
        </div>
        <div className="flex items-center gap-3">
          <ActionButton label="Refresh" icon={RefreshCcw} onClick={() => {
            fetchViolations();
            fetchCases();
          }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {(["violations", "cases", "policy"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeTab === tab ? "bg-[#4B0B14] text-white" : "bg-white text-[#4B0B14] border border-[#f3dcc0]"
            }`}
          >
            {tab === "violations" ? "Violations" : tab === "cases" ? "Cases" : "Policy"}
          </button>
        ))}
      </div>

      {activeTab === "violations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f3dcc0]">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Violations</p>
              <h3 className="text-2xl font-bold mt-2">{violationsCount}</h3>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f3dcc0]">
              <p className="text-xs uppercase tracking-wide text-gray-500">Pending</p>
              <h3 className="text-2xl font-bold mt-2">{violationSummary.pending}</h3>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f3dcc0]">
              <p className="text-xs uppercase tracking-wide text-gray-500">Escalated</p>
              <h3 className="text-2xl font-bold mt-2">{violationSummary.escalated}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f3dcc0] space-y-4">
              <h2 className="font-semibold">Manual Violation Entry</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                  placeholder="Employee ID"
                  value={manualViolation.employee_id}
                  onChange={(e) => setManualViolation((prev) => ({ ...prev, employee_id: e.target.value }))}
                />
                <select
                  className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                  value={manualViolation.violation_type}
                  onChange={(e) => setManualViolation((prev) => ({ ...prev, violation_type: e.target.value }))}
                >
                  <option value="late">Late</option>
                  <option value="absence">Absence</option>
                  <option value="undertime">Undertime</option>
                  <option value="missing_log">Missing Log</option>
                  <option value="unauthorized_ot">Unauthorized OT</option>
                </select>
                <input
                  type="date"
                  className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                  value={manualViolation.violation_date}
                  onChange={(e) => setManualViolation((prev) => ({ ...prev, violation_date: e.target.value }))}
                />
                <input
                  className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                  placeholder="Minutes (optional)"
                  value={manualViolation.violation_minutes}
                  onChange={(e) => setManualViolation((prev) => ({ ...prev, violation_minutes: e.target.value }))}
                />
              </div>
              <textarea
                className="w-full border border-[#e5c8a8] rounded-lg px-3 py-2"
                placeholder="Remarks"
                value={manualViolation.remarks}
                onChange={(e) => setManualViolation((prev) => ({ ...prev, remarks: e.target.value }))}
              />
              <ActionButton label="Create Violation" onClick={handleCreateViolation} />
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f3dcc0] space-y-4">
              <h2 className="font-semibold">Scan Missing Logs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="date"
                  className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                  value={scanRange.start_date}
                  onChange={(e) => setScanRange((prev) => ({ ...prev, start_date: e.target.value }))}
                />
                <input
                  type="date"
                  className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                  value={scanRange.end_date}
                  onChange={(e) => setScanRange((prev) => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
              <ActionButton label="Run Scan" onClick={handleScan} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f3dcc0]">
            <h2 className="font-semibold mb-4">Violation Records</h2>
            {violationsLoading ? (
              <p className="text-sm text-gray-500">Loading violations...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-500 border-b border-[#f3dcc0]">
                      <th className="py-2">Date</th>
                      <th className="py-2">Employee</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Minutes</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violations.map((row) => (
                      <tr key={row.id} className="border-b border-[#f7e7d4]">
                        <td className="py-2">{row.violation_date}</td>
                        <td className="py-2">{row.employee_code || row.employee_id}</td>
                        <td className="py-2 capitalize">{String(row.violation_type).replace("_", " ")}</td>
                        <td className="py-2">{row.violation_minutes ?? "-"}</td>
                        <td className="py-2 capitalize">{row.status}</td>
                        <td className="py-2">
                          {canManage && (
                            <select
                              className="border border-[#e5c8a8] rounded-lg px-2 py-1"
                              value={row.status}
                              onChange={(e) => handleUpdateViolationStatus(row.id, e.target.value)}
                            >
                              <option value="pending">pending</option>
                              <option value="escalated">escalated</option>
                              <option value="resolved">resolved</option>
                              <option value="dismissed">dismissed</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "cases" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f3dcc0]">
            <h2 className="font-semibold mb-4">Cases</h2>
            {casesLoading ? (
              <p className="text-sm text-gray-500">Loading cases...</p>
            ) : (
              <div className="space-y-3">
                {cases.map((row) => (
                  <div key={row.id} className="border border-[#f3dcc0] rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{row.case_number}</p>
                      <p className="text-xs text-gray-500">{row.employee_code || row.employee_id} · {row.status}</p>
                    </div>
                    <button
                      className="flex items-center gap-2 text-sm text-[#4B0B14]"
                      onClick={() => setSelectedCaseId(row.id)}
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f3dcc0] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Case Detail</h2>
              <button
                className="text-xs text-gray-500"
                onClick={() => setSelectedCaseId(null)}
              >
                Clear
              </button>
            </div>

            {!selectedCaseId && <p className="text-sm text-gray-500">Select a case to see details.</p>}
            {caseDetailLoading && <p className="text-sm text-gray-500">Loading case detail...</p>}

            {caseDetail && !caseDetailLoading && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#f3dcc0] p-4">
                  <p className="font-medium">{caseDetail.case_number}</p>
                  <p className="text-xs text-gray-500">Status: {caseDetail.status}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Violations</h3>
                  <div className="space-y-2">
                    {(caseDetail.violations || []).map((v: any) => (
                      <div key={v.id} className="text-xs text-gray-600">
                        {v.violation_date} · {v.violation_type} · {v.status}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Notices</h3>
                  <div className="space-y-2">
                    {(caseDetail.notices || []).map((n: any) => (
                      <div key={n.id} className="border border-[#f3dcc0] rounded-lg p-3 text-xs">
                        <p className="font-medium">{n.notice_type} · {n.status}</p>
                        <p className="text-gray-500">{n.subject}</p>
                        {n.status === "draft" && (
                          <button
                            className="mt-2 text-[#4B0B14] underline"
                            onClick={() => handleSendNotice(n.id)}
                          >
                            Send Notice
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Create Notice</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      value={noticeDraft.notice_type}
                      onChange={(e) => setNoticeDraft((prev) => ({ ...prev, notice_type: e.target.value }))}
                    >
                      <option value="NTE">NTE</option>
                      <option value="hearing_notice">Hearing Notice</option>
                      <option value="decision_notice">Decision Notice</option>
                    </select>
                    <input
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      placeholder="Subject"
                      value={noticeDraft.subject}
                      onChange={(e) => setNoticeDraft((prev) => ({ ...prev, subject: e.target.value }))}
                    />
                    <textarea
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      placeholder="Content"
                      value={noticeDraft.content}
                      onChange={(e) => setNoticeDraft((prev) => ({ ...prev, content: e.target.value }))}
                    />
                    <input
                      type="datetime-local"
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      value={noticeDraft.due_date}
                      onChange={(e) => setNoticeDraft((prev) => ({ ...prev, due_date: e.target.value }))}
                    />
                    <select
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      value={noticeDraft.sent_via}
                      onChange={(e) => setNoticeDraft((prev) => ({ ...prev, sent_via: e.target.value }))}
                    >
                      <option value="internal">Internal</option>
                      <option value="email">Email</option>
                      <option value="both">Both</option>
                    </select>
                    <label className="text-xs text-gray-600 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={noticeDraft.send_now}
                        onChange={(e) => setNoticeDraft((prev) => ({ ...prev, send_now: e.target.checked }))}
                      />
                      Send immediately
                    </label>
                    <ActionButton label="Create Notice" onClick={handleCreateNotice} />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Schedule Hearing</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="datetime-local"
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      value={hearingDraft.hearing_datetime}
                      onChange={(e) => setHearingDraft((prev) => ({ ...prev, hearing_datetime: e.target.value }))}
                    />
                    <select
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      value={hearingDraft.hearing_type}
                      onChange={(e) => setHearingDraft((prev) => ({ ...prev, hearing_type: e.target.value }))}
                    >
                      <option value="face_to_face">Face to Face</option>
                      <option value="virtual">Virtual</option>
                    </select>
                    <input
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      placeholder="Location or Link"
                      value={hearingDraft.location_or_link}
                      onChange={(e) => setHearingDraft((prev) => ({ ...prev, location_or_link: e.target.value }))}
                    />
                    <label className="text-xs text-gray-600 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hearingDraft.send_notice}
                        onChange={(e) => setHearingDraft((prev) => ({ ...prev, send_notice: e.target.checked }))}
                      />
                      Send hearing notice
                    </label>
                    <ActionButton label="Schedule Hearing" onClick={handleScheduleHearing} />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Issue Decision</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      value={decisionDraft.decision_type}
                      onChange={(e) => setDecisionDraft((prev) => ({ ...prev, decision_type: e.target.value }))}
                    >
                      <option value="dismissed">Dismissed</option>
                      <option value="verbal_warning">Verbal Warning</option>
                      <option value="written_warning">Written Warning</option>
                      <option value="suspension">Suspension</option>
                      <option value="termination">Termination</option>
                      <option value="policy_coaching">Policy Coaching</option>
                      <option value="no_violation">No Violation</option>
                    </select>
                    <input
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      placeholder="Penalty days (optional)"
                      value={decisionDraft.penalty_days}
                      onChange={(e) => setDecisionDraft((prev) => ({ ...prev, penalty_days: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      value={decisionDraft.effective_date}
                      onChange={(e) => setDecisionDraft((prev) => ({ ...prev, effective_date: e.target.value }))}
                    />
                    <textarea
                      className="border border-[#e5c8a8] rounded-lg px-3 py-2"
                      placeholder="Decision summary"
                      value={decisionDraft.decision_summary}
                      onChange={(e) => setDecisionDraft((prev) => ({ ...prev, decision_summary: e.target.value }))}
                    />
                    <label className="text-xs text-gray-600 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={decisionDraft.send_notice}
                        onChange={(e) => setDecisionDraft((prev) => ({ ...prev, send_notice: e.target.checked }))}
                      />
                      Send decision notice
                    </label>
                    <ActionButton label="Issue Decision" onClick={handleIssueDecision} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "policy" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f3dcc0] space-y-4">
          <h2 className="font-semibold">Policy Configuration</h2>
          {policyLoading ? (
            <p className="text-sm text-gray-500">Loading policy...</p>
          ) : (
            <textarea
              className="w-full min-h-[320px] border border-[#e5c8a8] rounded-lg px-3 py-2 font-mono text-xs"
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
            />
          )}
          <ActionButton label="Save Policy" onClick={handleSavePolicy} />
        </div>
      )}
    </div>
  );
}
