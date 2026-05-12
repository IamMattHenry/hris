"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, QrCode, KeyRound, ShieldCheck, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { payrollApi, fingerprintApi } from "@/lib/api";
import { showToast } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import QRCodeScanner from "@/app/attendance_system/Scanner/QRCodeScanner";

export type TwoFAMethod = "fingerprint" | "qr" | "password";

const METHOD_LABELS: Record<TwoFAMethod, { label: string; icon: React.ReactNode; desc: string }> = {
  fingerprint: {
    label: "Fingerprint",
    icon: <Fingerprint size={22} />,
    desc: "Place your registered finger on the biometric sensor",
  },
  qr: {
    label: "QR Code",
    icon: <QrCode size={22} />,
    desc: "Scan the QR code displayed on the payroll terminal",
  },
  password: {
    label: "Password",
    icon: <KeyRound size={22} />,
    desc: "Enter your account password to confirm your identity",
  },
};

interface Payroll2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: "payroll_create" | "payroll_finalize";
  actionReferenceId?: number | null;
  /** Called with the verified sessionId so the parent can pass it to the API */
  onVerified: (sessionId: number, method: TwoFAMethod) => void;
}

type Step = "choose-method" | "verify" | "done";

export default function Payroll2FAModal({
  isOpen,
  onClose,
  actionType,
  actionReferenceId = null,
  onVerified,
}: Payroll2FAModalProps) {
  const { user } = useAuth();
  const isFingerprintNull = user?.fingerprint_id == null;

  const [step, setStep] = useState<Step>("choose-method");
  const [method, setMethod] = useState<TwoFAMethod>("fingerprint");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Auto-verify if code changes for QR / fingerprint
  useEffect(() => {
    if (step === "verify" && code.trim() && (method === "fingerprint" || method === "qr")) {
      handleVerify();
    }
  }, [code]);

  // Handle fingerprint scanning
  useEffect(() => {
    if (step === "verify" && method === "fingerprint") {
      fingerprintApi.startScan().catch(err => {
        console.error("Failed to start fingerprint scan:", err);
      });

      const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:3001";
      const eventSource = new EventSource(`${bridgeUrl}/events`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "fingerprint_scanned" && data.fingerprint_id) {
            setCode(data.fingerprint_id.toString());
            eventSource.close();
          }
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    }
  }, [step, method]);

  /* Reset when opened */
  useEffect(() => {
    if (isOpen) {
      setStep("choose-method");
      setMethod(isFingerprintNull ? "password" : "fingerprint");
      setSessionId(null);
      setCode("");
      setError(null);
      setExpiresIn(null);
      setTimeLeft(null);
    }
  }, [isOpen]);

  /* Countdown timer */
  useEffect(() => {
    if (expiresIn == null || step !== "verify") return;
    setTimeLeft(expiresIn);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t == null || t <= 1) {
          clearInterval(id);
          setError("Verification session expired. Please start over.");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [expiresIn, step]);

  const handleInitiate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollApi.initiate2FA({
        actionType,
        preferredMethod: method,
        actionReferenceId,
      });
      if (!res.success || !res.data?.sessionId) {
        throw new Error(res.message || "Failed to start 2FA session");
      }
      setSessionId(res.data.sessionId);
      setExpiresIn(res.data.expiresIn ?? 300);
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to initiate 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!sessionId || !code.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await payrollApi.verify2FA({
        sessionId,
        verificationCode: code.trim(),
        method,
      });
      if (!res.success) {
        throw new Error(res.message || "Verification failed");
      }
      setStep("done");
      showToast.success("Identity verified — proceeding with payroll action");
      // Small delay so user sees the success state
      setTimeout(() => {
        onVerified(sessionId, method);
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const actionLabel = actionType === "payroll_create" ? "Create Payroll Run" : "Finalize Payroll Run";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden text-[#3D1A0B]"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#3D1A0B] text-white">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} />
                <div>
                  <p className="font-bold text-sm">Identity Verification Required</p>
                  <p className="text-xs opacity-75">{actionLabel}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/20 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* STEP 1: Choose method */}
              {step === "choose-method" && (
                <>
                  <p className="text-sm text-[#3D1A0B]/70">
                    To proceed with <strong>{actionLabel.toLowerCase()}</strong>, you must verify your
                    identity using one of the methods below.
                  </p>

                  <div className="space-y-2">
                    {(Object.keys(METHOD_LABELS) as TwoFAMethod[]).map((m) => {
                      const info = METHOD_LABELS[m];
                      const isDisabled = m === "fingerprint" && isFingerprintNull;
                      return (
                        <label
                          key={m}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition ${
                            isDisabled
                              ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
                              : method === m
                              ? "border-[#3D1A0B] bg-[#F3E5CF] cursor-pointer"
                              : "border-[#E8D9C4] hover:bg-[#FAF6F1] cursor-pointer"
                          }`}
                        >
                          <input
                            type="radio"
                            name="2fa-method"
                            value={m}
                            checked={method === m}
                            onChange={() => !isDisabled && setMethod(m)}
                            disabled={isDisabled}
                            className="sr-only"
                          />
                          <div className="shrink-0">{info.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{info.label}</p>
                            <p className="text-xs text-[#3D1A0B]/60 mt-0.5">
                              {isDisabled ? "No fingerprint registered for this account" : info.desc}
                            </p>
                          </div>
                          {method === m && !isDisabled && (
                            <CheckCircle2 size={18} className="shrink-0 text-[#3D1A0B]" />
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                      <AlertCircle size={16} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      onClick={onClose}
                      className="px-5 py-2 border border-[#E8D9C4] rounded-lg text-sm hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInitiate}
                      disabled={loading}
                      className="px-5 py-2 bg-[#3D1A0B] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-60 transition"
                    >
                      {loading ? "Initiating..." : "Continue →"}
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2: Enter verification code */}
              {step === "verify" && (
                <>
                  <div className="text-center space-y-1">
                    <div className="mx-auto w-14 h-14 rounded-full bg-[#F3E5CF] flex items-center justify-center">
                      {METHOD_LABELS[method].icon}
                    </div>
                    <p className="font-semibold">{METHOD_LABELS[method].label} Verification</p>
                    <p className="text-xs text-[#3D1A0B]/60">{METHOD_LABELS[method].desc}</p>
                    {timeLeft != null && (
                      <p className="text-xs font-mono text-amber-700">
                        Session expires in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                      </p>
                    )}
                  </div>

                  {method === "qr" ? (
                    <div className="mt-4">
                      <QRCodeScanner
                        onScan={(value) => setCode(value)}
                        isActive={step === "verify"}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block">Verification Code</label>
                      <input
                        type={method === "password" ? "password" : "text"}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !loading) handleVerify();
                        }}
                        placeholder={
                          method === "fingerprint"
                            ? "Enter fingerprint scan token"
                            : "Enter your password"
                        }
                        className="w-full border border-[#E8D9C4] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#3D1A0B]/30 font-mono text-sm"
                        autoFocus
                      />
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                      <AlertCircle size={16} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex justify-between items-center gap-3 pt-1">
                    <button
                      onClick={() => {
                        setStep("choose-method");
                        setCode("");
                        setError(null);
                      }}
                      className="text-sm text-[#3D1A0B]/60 hover:text-[#3D1A0B] transition"
                    >
                      ← Change method
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={loading || !code.trim() || (timeLeft != null && timeLeft <= 0)}
                      className="px-5 py-2 bg-[#3D1A0B] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-60 transition"
                    >
                      {loading ? "Verifying..." : "Verify Identity"}
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3: Success */}
              {step === "done" && (
                <div className="flex flex-col items-center justify-center py-4 gap-3">
                  <CheckCircle2 size={48} className="text-green-600" />
                  <p className="font-semibold text-green-700">Identity Verified</p>
                  <p className="text-sm text-[#3D1A0B]/60">Proceeding…</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
