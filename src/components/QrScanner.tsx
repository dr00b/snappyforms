"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// jsQR inspects every pixel it is handed, so feeding it a full-resolution phone
// frame on every animation frame burns battery and drags the rate low enough
// that scanning feels broken even when the camera opened fine. QR codes survive
// downscaling comfortably.
const MAX_SCAN_DIMENSION = 640;

type CameraFailure = {
  message: string;
  /** Raw error name, surfaced small so a bug report can name the actual cause. */
  detail?: string;
};

/**
 * Every getUserMedia rejection used to collapse into one "Camera unavailable"
 * string, which is why the Pixel 7 report (#11) could not be acted on: denied
 * permission, a camera held by another app, and an in-app webview with no
 * camera access at all are different problems with different fixes, and the
 * user is the only one who can tell them apart.
 */
function describeFailure(error: unknown): CameraFailure {
  const name = error instanceof Error ? error.name : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return {
        message:
          "Camera access was blocked. Allow the camera for this site in your browser settings and try again — or, if you opened this link from another app, reopen it in Chrome or Safari.",
        detail: name,
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return { message: "No camera was found on this device.", detail: name };
    case "NotReadableError":
    case "TrackStartError":
      return {
        message: "The camera is being used by another app. Close it and try again.",
        detail: name,
      };
    default:
      return {
        message: "The camera could not be started. Use manual entry below.",
        detail: name || undefined,
      };
  }
}

/**
 * Ask for the rear camera, but do not insist on it. `facingMode` is a hint
 * rather than a constraint, yet some devices still reject the request outright
 * instead of picking whatever they have — so a rejection that looks like "no
 * such camera" is retried without the preference before it reaches the user.
 */
async function acquireStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError" || name === "NotFoundError") {
      return navigator.mediaDevices.getUserMedia({ video: true });
    }
    throw error;
  }
}

export function QrScanner({ onDecode }: { onDecode: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [failure, setFailure] = useState<CameraFailure | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Held in a ref so a new callback identity from the parent cannot tear down
  // and restart the camera mid-scan.
  const onDecodeRef = useRef(onDecode);
  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  useEffect(() => {
    let cancelled = false;
    doneRef.current = false;

    async function start() {
      // getUserMedia is simply absent outside a secure context, and undefined
      // on some in-app webviews, so both have to be checked before the call
      // rather than caught after it.
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setFailure({
          message: "The camera needs a secure (https) connection. Open this page over https and try again.",
          detail: "insecure-context",
        });
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setFailure({
          message:
            "This browser cannot open the camera. Open the page in Chrome or Safari, then try again.",
          detail: "getusermedia-unavailable",
        });
        return;
      }

      let stream: MediaStream;
      try {
        stream = await acquireStream();
      } catch (error) {
        if (!cancelled) setFailure(describeFailure(error));
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      video.srcObject = stream;
      try {
        await video.play();
      } catch (error) {
        // A rejected play() is its own failure — autoplay policy, not camera
        // access — and must not be reported as an unavailable camera.
        if (!cancelled) {
          setFailure({
            message: "The camera preview could not start. Tap Try again.",
            detail: error instanceof Error ? error.name : "play-failed",
          });
        }
        return;
      }

      if (!cancelled) tick();
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || doneRef.current || cancelled) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const scale = Math.min(1, MAX_SCAN_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
        const width = Math.round(video.videoWidth * scale);
        const height = Math.round(video.videoHeight * scale);

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            doneRef.current = true;
            onDecodeRef.current(code.data);
            return;
          }
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  function retry() {
    // Clearing the failure in the same update remounts the <video> before the
    // effect reruns, so the ref is populated by the time start() needs it.
    setFailure(null);
    setAttempt((a) => a + 1);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black">
      {failure ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-white">{failure.message}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Try again
          </button>
          {failure.detail && (
            <p className="text-[10px] uppercase tracking-wide text-white/40">{failure.detail}</p>
          )}
        </div>
      ) : (
        <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
