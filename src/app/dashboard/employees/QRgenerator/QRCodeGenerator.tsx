"use client";

import { useEffect, useState } from "react";
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
  employee: EmployeeQRData;   // Now required (single employee only)
  size?: number;
}

export default function EmployeeIDCard({
  employee,
  size = 200,
}: EmployeeIDCardProps) {
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true); // Default open for ID view

  // Generate ID Card for preview
  useEffect(() => {
    const generateIDPreview = async () => {
      setLoading(true);
      try {
        const dataToEncode = JSON.stringify({
          employee_id: employee.employee_id,
          employee_code: employee.employee_code,
          first_name: employee.first_name,
          last_name: employee.last_name,
          position_name: employee.position_name,
          department_name: employee.department_name,
          schedule_time: employee.schedule_time || "08:00",
        });

        const idCard = document.createElement("div");

        Object.assign(idCard.style, {
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "320px",
          height: "500px",
          background: "#fdfdfd",
          border: "2px solid #d4af37",
          borderRadius: "16px",
          overflow: "hidden",
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        });

        idCard.innerHTML = `
          <!-- Header -->
          <div style="background: #3b2b1c; width: 100%; padding: 24px 20px; display: flex; align-items: center; justify-content: center; gap: 12px; flex-shrink: 0;">
            <img src="/logo/logo_outline.png" alt="Logo" style="width: 32px; height: 32px; object-fit: contain;" crossorigin="anonymous" />
            <div style="color: #ffffff; font-weight: 700; font-size: 20px; letter-spacing: 2.5px; text-transform: uppercase; line-height: 1;">Celestia Hotel</div>
          </div>

          <!-- Gold divider -->
          <div style="background: linear-gradient(90deg, #b8860b, #e6be8a, #d4af37, #e6be8a, #b8860b); height: 5px; width: 100%; flex-shrink: 0;"></div>

          <!-- Body -->
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 28px 24px 20px; background: #fdfdfd;">

            <!-- Name & Role -->
            <div style="text-align: center; width: 100%;">
              <h2 style="margin: 0 0 10px; color: #3b2b1c; font-size: 22px; font-weight: 800; letter-spacing: 1px; line-height: 1.2; text-transform: uppercase;">
                ${employee.first_name} ${employee.last_name}
              </h2>
              <div style="height: 2px; width: 50px; background: linear-gradient(90deg, #b8860b, #e6be8a, #b8860b); margin: 0 auto 12px;"></div>
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #555555; font-style: italic;">
                ${employee.position_name || "Staff"}
              </p>
              <p style="margin: 0; font-size: 10px; color: #aaaaaa; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">
                ${employee.department_name || "Operations"}
              </p>
            </div>

            <!-- QR Code -->
            <div style="background: #ffffff; padding: 12px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <canvas id="qr-preview-canvas" width="148" height="148"></canvas>
            </div>

            <!-- Employee ID Badge -->
            <div style="border: 1px solid #d4af37; border-radius: 6px; padding: 7px 22px; background: #ffffff; text-align: center;">
              <span style="color: #3b2b1c; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                Employee ID: ${employee.employee_code || employee.employee_id}
              </span>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #3b2b1c; height: 30px; width: 100%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="color: #d4af37; font-size: 8px; letter-spacing: 4px; text-transform: uppercase; font-weight: 500;">
              Staff Identification Card
            </span>
          </div>
        `;

        document.body.appendChild(idCard);

        const qrCanvas = idCard.querySelector("#qr-preview-canvas") as HTMLCanvasElement;
        await QRCode.toCanvas(qrCanvas, dataToEncode, {
          width: 148,
          margin: 1,
          color: { dark: "#3b2b1c", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        const canvas = await html2canvas(idCard, {
          scale: 3,
          backgroundColor: null,
          useCORS: true,
          logging: false,
        });

        document.body.removeChild(idCard);

        setQrUrl(canvas.toDataURL("image/png"));
      } catch (err) {
        console.error("ID Card preview generation failed:", err);
      } finally {
        setLoading(false);
      }
    };

    generateIDPreview();
  }, [employee, size]);

  // Download Full ID Card (with photo-style design + QR)
  const downloadIDCard = async () => {
    const toastId = toast.loading("Generating ID Card...");

    try {
      const dataToEncode = JSON.stringify({
        employee_id: employee.employee_id,
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        position_name: employee.position_name,
        department_name: employee.department_name || "Department",
        schedule_time: employee.schedule_time || "08:00",
      });

      const idCard = document.createElement("div");

      Object.assign(idCard.style, {
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "320px",
        height: "500px",
        background: "#fdfdfd",
        border: "2px solid #d4af37",
        borderRadius: "16px",
        overflow: "hidden",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      });

      idCard.innerHTML = `
        <!-- Header -->
        <div style="background: #3b2b1c; width: 100%; padding: 24px 20px; display: flex; align-items: center; justify-content: center; gap: 12px; flex-shrink: 0;">
          <img src="/logo/logo_outline.png" alt="Logo" style="width: 32px; height: 32px; object-fit: contain;" crossorigin="anonymous" />
          <div style="color: #ffffff; font-weight: 700; font-size: 20px; letter-spacing: 2.5px; text-transform: uppercase; line-height: 1;">Celestia Hotel</div>
        </div>

        <!-- Gold divider -->
        <div style="background: linear-gradient(90deg, #b8860b, #e6be8a, #d4af37, #e6be8a, #b8860b); height: 5px; width: 100%; flex-shrink: 0;"></div>

        <!-- Body -->
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 28px 24px 20px; background: #fdfdfd;">

          <!-- Name & Role -->
          <div style="text-align: center; width: 100%;">
            <h2 style="margin: 0 0 10px; color: #3b2b1c; font-size: 22px; font-weight: 800; letter-spacing: 1px; line-height: 1.2; text-transform: uppercase;">
              ${employee.first_name} ${employee.last_name}
            </h2>
            <div style="height: 2px; width: 50px; background: linear-gradient(90deg, #b8860b, #e6be8a, #b8860b); margin: 0 auto 12px;"></div>
            <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #555555; font-style: italic;">
              ${employee.position_name || "Staff"}
            </p>
            <p style="margin: 0; font-size: 10px; color: #aaaaaa; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">
              ${employee.department_name || "Operations"}
            </p>
          </div>

          <!-- QR Code -->
          <div style="background: #ffffff; padding: 12px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <canvas id="qr-single" width="148" height="148"></canvas>
          </div>

          <!-- Employee ID Badge -->
          <div style="border: 1px solid #d4af37; border-radius: 6px; padding: 7px 22px; background: #ffffff; text-align: center;">
            <span style="color: #3b2b1c; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
              Employee ID: ${employee.employee_code || employee.employee_id}
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #3b2b1c; height: 30px; width: 100%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="color: #d4af37; font-size: 8px; letter-spacing: 4px; text-transform: uppercase; font-weight: 500;">
            Staff Identification Card
          </span>
        </div>
      `;

      document.body.appendChild(idCard);

      // Generate QR on canvas
      const qrCanvas = idCard.querySelector("#qr-single") as HTMLCanvasElement;
      await QRCode.toCanvas(qrCanvas, dataToEncode, {
        width: 148,
        margin: 1,
        color: { dark: "#3b2b1c", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(idCard, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(idCard);

      // Download
      const link = document.createElement("a");
      link.download = `${employee.first_name}_${employee.last_name}_ID_Card.png`.replace(/[^a-zA-Z0-9_.-]/g, "");
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.dismiss(toastId);
      toast.success("ID Card downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Failed to generate ID Card");
    }
  };

  return (
    <div className="bg-[#fff7ec] rounded-xl shadow-md w-full max-w-sm mx-auto overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-[#3b2b1c] font-semibold hover:bg-[#f2e4ce] transition"
      >
        <span>Employee ID Card</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div className="p-6 space-y-6">
          {/* QR Preview */}
          <div className="flex justify-center">
            {loading ? (
              <p className="text-sm text-gray-500 py-8">Generating QR Code...</p>
            ) : (
              <img
                src={qrUrl}
                alt="Employee QR"
                className="rounded-lg border border-[#d6c3aa] bg-white p-3 shadow-sm"
                width={size}
                height={size}
              />
            )}
          </div>

          {/* Download Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={downloadIDCard}
              className="flex items-center justify-center gap-2 bg-[#3b2b1c] hover:bg-[#2a2118] text-white font-semibold py-3 rounded-xl transition shadow-md"
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