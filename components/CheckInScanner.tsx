"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { CheckCircle2, Scan, XCircle } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";

type ScanResult =
  | { type: "idle"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const SCAN_COOLDOWN_MS = 1500;

export default function CheckInScanner({ eventId }: { eventId: Id<"events"> }) {
  const { user } = useUser();
  const checkInTicket = useMutation(api.tickets.checkInTicket);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult>({
    type: "idle",
    message: "Point the camera at a ticket QR code.",
  });
  const [manualValue, setManualValue] = useState("");
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported on this device.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!isMounted) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScannerReady(true);
      } catch (error) {
        console.error("Failed to start camera:", error);
        setCameraError("Unable to access the camera. Check permissions.");
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!scannerReady || !videoRef.current) return;
    const BarcodeDetector = (window as { BarcodeDetector?: any })
      .BarcodeDetector;
    if (!BarcodeDetector) {
      setCameraError(
        "This browser does not support QR scanning. Use manual entry."
      );
      return;
    }

    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    let animationFrameId = 0;

    const scanFrame = async () => {
      if (!videoRef.current) return;
      if (isScanningRef.current) {
        animationFrameId = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const value = barcodes[0]?.rawValue?.trim();
          if (value) {
            const now = Date.now();
            if (
              lastScanRef.current &&
              lastScanRef.current.value === value &&
              now - lastScanRef.current.time < SCAN_COOLDOWN_MS
            ) {
              animationFrameId = requestAnimationFrame(scanFrame);
              return;
            }

            lastScanRef.current = { value, time: now };
            isScanningRef.current = true;
            await handleScan(value);
            isScanningRef.current = false;
          }
        }
      } catch (error) {
        console.error("Scan failed:", error);
      }

      animationFrameId = requestAnimationFrame(scanFrame);
    };

    animationFrameId = requestAnimationFrame(scanFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [scannerReady]);

  const handleScan = async (value: string) => {
    if (!user?.id) return;
    let response:
      | Awaited<ReturnType<typeof checkInTicket>>
      | null = null;
    try {
      response = await checkInTicket({
        ticketId: value as Id<"tickets">,
        eventId,
        sellerId: user.id,
      });
    } catch (error) {
      console.error("Check-in failed:", error);
      setResult({ type: "error", message: "Invalid ticket code." });
      return;
    }

    switch (response.status) {
      case "checked_in":
        setResult({
          type: "success",
          message: `Checked in ${
            response.attendee.attendeeName?.trim() ||
            response.attendee.userName
          }.`,
        });
        break;
      case "already_checked_in":
        setResult({ type: "error", message: "Ticket already checked in." });
        break;
      case "wrong_event":
        setResult({
          type: "error",
          message: "This ticket does not belong to this event.",
        });
        break;
      case "event_cancelled":
        setResult({ type: "error", message: "This event is cancelled." });
        break;
      default:
        setResult({ type: "error", message: "Invalid ticket." });
        break;
    }
  };

  const handleManualSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!manualValue.trim()) return;
    await handleScan(manualValue.trim());
    setManualValue("");
  };

  const resultStyles =
    result.type === "success"
      ? "bg-green-50 border-green-200 text-green-700"
      : result.type === "error"
        ? "bg-red-50 border-red-200 text-red-700"
        : "bg-gray-50 border-gray-200 text-gray-600";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
          <Scan className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Scan attendees
          </h2>
          <p className="text-sm text-gray-500">
            Use your camera or enter a ticket ID manually.
          </p>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
        <video
          ref={videoRef}
          className="w-full aspect-[4/3] object-cover"
          muted
          playsInline
        />
        {!scannerReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white bg-black/50">
            Starting camera...
          </div>
        )}
      </div>

      {cameraError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {cameraError}
        </div>
      )}

      <div className={`border rounded-lg p-3 flex items-center gap-2 ${resultStyles}`}>
        {result.type === "success" ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : result.type === "error" ? (
          <XCircle className="w-5 h-5" />
        ) : (
          <Scan className="w-5 h-5" />
        )}
        <span className="text-sm font-medium">{result.message}</span>
      </div>

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          value={manualValue}
          onChange={(event) => setManualValue(event.target.value)}
          placeholder="Enter ticket ID"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
        />
        <button
          type="submit"
          className="bg-yellow-300 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-500 transition-colors"
        >
          Check in
        </button>
      </form>
    </div>
  );
}
