"use client";

import { useEffect, useState } from "react";
import { dueProcessApi } from "@/lib/api";
import { toast } from "react-hot-toast";

export default function EmployeeDueProcessPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [explanationText, setExplanationText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [noticeResult, caseResult] = await Promise.all([
      dueProcessApi.getMyNotices(),
      dueProcessApi.getMyCases(),
    ]);

    if (noticeResult.success) {
      setNotices(noticeResult.data || []);
    } else {
      setNotices([]);
      toast.error(noticeResult.message || "Failed to load notices");
    }

    if (caseResult.success) {
      setCases(caseResult.data || []);
    } else {
      setCases([]);
      toast.error(caseResult.message || "Failed to load cases");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAcknowledge = async (noticeId: number) => {
    const result = await dueProcessApi.acknowledgeNotice(noticeId);
    if (!result.success) {
      toast.error(result.message || "Failed to acknowledge notice");
      return;
    }
    toast.success("Notice acknowledged");
    fetchData();
  };

  const handleSubmitExplanation = async () => {
    if (!selectedCaseId) {
      toast.error("Select a case first");
      return;
    }
    if (!explanationText.trim()) {
      toast.error("Explanation text is required");
      return;
    }

    const result = await dueProcessApi.submitExplanation(selectedCaseId, {
      explanation_text: explanationText,
      attachment_url: attachmentUrl || null,
    });

    if (!result.success) {
      toast.error(result.message || "Failed to submit explanation");
      return;
    }

    toast.success("Explanation submitted");
    setExplanationText("");
    setAttachmentUrl("");
    fetchData();
  };

  return (
    <div className="min-h-screen p-6 md:p-8 font-poppins bg-[#fcfaf8] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#3b2b1c]">Due Process Notices</h1>
        <p className="text-sm text-gray-600">Review your notices and submit explanations when required.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f3dcc0]">
              <h2 className="font-semibold mb-4">Notices</h2>
              <div className="space-y-3">
                {notices.length === 0 && (
                  <p className="text-sm text-gray-500">No notices available.</p>
                )}
                {notices.map((notice) => (
                  <div key={notice.id} className="border border-[#f3dcc0] rounded-xl p-4">
                    <p className="text-xs text-gray-500">{notice.notice_type}</p>
                    <p className="font-medium">{notice.subject}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line mt-2">{notice.content}</p>
                    <p className="text-xs text-gray-500 mt-2">Status: {notice.status}</p>
                    {notice.status !== "acknowledged" && (
                      <button
                        className="mt-3 text-sm text-[#4B0B14] underline"
                        onClick={() => handleAcknowledge(notice.id)}
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f3dcc0]">
              <h2 className="font-semibold mb-4">Cases</h2>
              <div className="space-y-2">
                {cases.length === 0 && (
                  <p className="text-sm text-gray-500">No cases found.</p>
                )}
                {cases.map((item) => (
                  <button
                    key={item.id}
                    className={`w-full text-left border rounded-lg p-3 ${
                      selectedCaseId === item.id
                        ? "border-[#4B0B14] bg-[#fff3e6]"
                        : "border-[#f3dcc0]"
                    }`}
                    onClick={() => setSelectedCaseId(item.id)}
                  >
                    <p className="text-sm font-medium">{item.case_number}</p>
                    <p className="text-xs text-gray-500">Status: {item.status}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f3dcc0] space-y-4">
            <h2 className="font-semibold">Submit Explanation</h2>
            <p className="text-sm text-gray-500">Select a case and submit your response to the Notice to Explain.</p>
            <textarea
              className="w-full min-h-[160px] border border-[#e5c8a8] rounded-lg px-3 py-2"
              placeholder="Write your explanation..."
              value={explanationText}
              onChange={(e) => setExplanationText(e.target.value)}
            />
            <input
              className="w-full border border-[#e5c8a8] rounded-lg px-3 py-2"
              placeholder="Attachment URL (optional)"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
            />
            <button
              className="w-full bg-[#4B0B14] text-white py-2 rounded-lg"
              onClick={handleSubmitExplanation}
            >
              Submit Explanation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
