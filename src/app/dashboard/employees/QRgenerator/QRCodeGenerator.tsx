"use client";

import { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "react-hot-toast";

interface EmployeeQRData {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  position_name: string;
  department_name?: string;
  schedule_time?: string;
}

interface EmployeeIDCardProps {
  employee: EmployeeQRData;
  size?: number;
}

export default function EmployeeIDCard({
  employee,
  size = 200,
}: EmployeeIDCardProps) {
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  const generateCardImage = useCallback(async () => {
    try {
      const dataToEncode = JSON.stringify({
        employee_id: employee.employee_id,
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        position_name: employee.position_name,
        department_name: employee.department_name || "Operations",
        schedule_time: employee.schedule_time || "08:00",
      });

      // FIX: Generate the QR code as a high-res Base64 Image URL instead of a canvas.
      // This prevents the QR library from breaking the HTML layout dimensions.
      const qrDataUrl = await QRCode.toDataURL(dataToEncode, {
        width: 400,
        margin: 1,
        color: { dark: "#3b2b1c", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });

      const idCard = document.createElement("div");

      Object.assign(idCard.style, {
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "320px",
        height: "500px",
        background: "#fdfcf9", // Slightly warmer white
        border: "2px solid #d4af37",
        borderRadius: "16px",
        overflow: "hidden",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      });

      idCard.innerHTML = `
        <div style="background: #3b2b1c; width: 100%; padding: 26px 20px 22px; display: flex; align-items: center; justify-content: center; gap: 12px; flex-shrink: 0;">
          <img src="/logo/logo_outline.png" alt="Logo" style="width: 32px; height: 32px; object-fit: contain;" crossorigin="anonymous" />
          <div style="color: #ffffff; font-weight: 700; font-size: 20px; letter-spacing: 2.5px; text-transform: uppercase; line-height: 1; margin-top: 2px;">Celestia Hotel</div>
        </div>

        <div style="background: linear-gradient(90deg, #b8860b, #e6be8a, #d4af37, #e6be8a, #b8860b); height: 5px; width: 100%; flex-shrink: 0;"></div>

        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 24px; background: #fdfcf9;">
          
          <div style="text-align: center; width: 100%;">
            <h2 style="margin: 0; color: #3b2b1c; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.1; text-transform: uppercase;">
              ${employee.first_name} ${employee.last_name}
            </h2>
            <div style="height: 3px; width: 40px; background: #d4af37; margin: 12px auto;"></div>
            <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #5c432b; font-style: italic;">
              ${employee.position_name || "Staff"}
            </p>
            <p style="margin: 0; font-size: 10px; color: #9a8063; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">
              ${employee.department_name || "Operations"}
            </p>
          </div>

          <div style="margin: 25px auto; background: #ffffff; padding: 12px; border: 2px solid #f0e1cc; border-radius: 12px; box-shadow: 0 6px 16px rgba(59, 43, 28, 0.06); display: flex; justify-content: center; align-items: center;">
            <img src="${qrDataUrl}" style="width: 150px; height: 150px; display: block;" />
          </div>

          <div style="background: #fdf8f0; border: 1px dashed #d4af37; border-radius: 8px; padding: 8px 24px; text-align: center; margin-top: auto;">
            <span style="color: #3b2b1c; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
              ID: ${employee.employee_code || employee.employee_id}
            </span>
          </div>
        </div>

        <div style="background: #3b2b1c; height: 32px; width: 100%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="color: #d4af37; font-size: 8.5px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600;">
            Staff Identification Card
          </span>
        </div>
      `;

      document.body.appendChild(idCard);

      // Wait a tiny bit to ensure the base64 image is fully rendered in the DOM
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(idCard, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(idCard);
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Card generation failed:", err);
      throw err;
    }
  }, [employee]);

  // Execute generation once on mount or when employee changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    generateCardImage()
      .then((url) => {
        if (isMounted) {
          setQrUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [generateCardImage]);

  // Instant Download (Re-uses the generated preview image!)
  const downloadIDCard = () => {
    if (!qrUrl) {
      toast.error("ID Card is still generating, please wait.");
      return;
    }

    try {
      const link = document.createElement("a");
      link.download = `${employee.first_name}_${employee.last_name}_ID_Card.png`.replace(/[^a-zA-Z0-9_.-]/g, "");
      link.href = qrUrl; 
      link.click();
      toast.success("ID Card downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download ID Card");
    }
  };

  return (
    <div className="bg-[#fff7ec] rounded-xl shadow-md w-full max-w-sm mx-auto overflow-hidden font-poppins">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-4 text-[#3b2b1c] font-bold hover:bg-[#f2e4ce] transition"
      >
        <span>Employee ID Card</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div className="p-6 space-y-6">
          {/* QR Preview */}
          <div className="flex justify-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b2b1c] mb-3"></div>
                <p className="text-sm text-[#8b7355] font-medium">Generating ID Card...</p>
              </div>
            ) : (
              <img
                src={qrUrl}
                alt="Employee ID Card"
                className="rounded-xl border border-[#d6c3aa] bg-white shadow-xl hover:shadow-2xl transition-shadow duration-300"
                style={{ width: `${size}px`, height: 'auto' }}
              />
            )}
          </div>

          {/* Download Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={downloadIDCard}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-[#3b2b1c] hover:bg-[#2a2118] disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-xl transition shadow-md active:scale-[0.98]"
            >
              <Download size={18} />
              Download Full ID Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}