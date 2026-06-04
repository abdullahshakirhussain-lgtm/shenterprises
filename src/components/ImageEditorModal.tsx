"use client";
import { useState, useRef, useEffect } from "react";

type CropBox = { x: number; y: number; width: number; height: number };

export default function ImageEditorModal({
  imageUrl,
  onClose,
  onSave,
}: {
  imageUrl: string;
  onClose: () => void;
  onSave: (newUrl: string) => void;
}) {
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState("");
  const [err, setErr] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function getRelativePos(e: React.MouseEvent) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    const pos = getRelativePos(e);
    setDragging(true);
    setDragStart(pos);
    setCrop({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const pos = getRelativePos(e);
    setCrop({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      width: Math.abs(pos.x - dragStart.x),
      height: Math.abs(pos.y - dragStart.y),
    });
  }

  function onMouseUp() {
    setDragging(false);
    if (crop && (crop.width < 3 || crop.height < 3)) setCrop(null);
  }

  function clearCrop() { setCrop(null); }

  async function process(action: "crop" | "remove-bg" | "crop-and-remove-bg") {
    setProcessing(true); setErr("");
    setStage(action === "remove-bg" ? "Removing background…" : action === "crop" ? "Cropping…" : "Cropping & removing background…");
    try {
      const body: any = { imageUrl };
      if (action === "crop" || action === "crop-and-remove-bg") {
        if (!crop) { setErr("Please draw a crop area first."); setProcessing(false); return; }
        body.crop = crop;
      }
      if (action === "remove-bg" || action === "crop-and-remove-bg") {
        body.removeBg = true;
      }

      const res = await fetch("/api/admin/ai/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSave(data.url);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setProcessing(false);
      setStage("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-brand-900">Edit product image</h2>
          <button onClick={onClose} className="text-brand-500 hover:text-brand-900 text-2xl leading-none">×</button>
        </div>

        <p className="text-sm text-brand-600 mb-3">
          Drag on the image to draw a crop area. Then choose: crop only, remove background only, or both.
        </p>

        <div
          ref={containerRef}
          className="relative select-none cursor-crosshair rounded overflow-hidden border border-brand-200 bg-checkered"
          style={{ userSelect: "none" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => dragging && onMouseUp()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="editing" className="w-full block pointer-events-none mx-auto"
            draggable={false} style={{ maxHeight: "60vh", objectFit: "contain" }} />

          {crop && crop.width > 0 && (
            <div className="absolute border-2 border-yellow-400 pointer-events-none"
              style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }}>
              <div className="absolute -top-6 left-0 bg-yellow-400 px-2 py-0.5 rounded text-xs text-yellow-900 font-medium">
                {Math.round(crop.width)}% × {Math.round(crop.height)}%
              </div>
            </div>
          )}
        </div>

        {crop && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-brand-600">Crop area selected</span>
            <button onClick={clearCrop} className="text-red-600 underline">Clear</button>
          </div>
        )}

        {err && <div className="mt-3 text-sm bg-red-50 text-red-800 p-2 rounded">{err}</div>}
        {stage && <div className="mt-3 text-sm bg-brand-50 text-brand-800 p-2 rounded">{stage}</div>}

        <div className="mt-4 flex flex-wrap gap-2 justify-end border-t border-brand-100 pt-4">
          <button onClick={onClose} disabled={processing} className="btn-secondary">Cancel</button>
          <button onClick={() => process("crop")} disabled={processing || !crop} className="btn-secondary">
            ✂️ Crop only
          </button>
          <button onClick={() => process("remove-bg")} disabled={processing} className="btn-secondary"
            title="Removes background using remove.bg AI">
            ✨ Remove background only
          </button>
          <button onClick={() => process("crop-and-remove-bg")} disabled={processing || !crop} className="btn-primary">
            ✂️✨ Crop + Remove background
          </button>
        </div>
      </div>

      <style jsx>{`
        .bg-checkered {
          background-image:
            linear-gradient(45deg, #eee 25%, transparent 25%),
            linear-gradient(-45deg, #eee 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #eee 75%),
            linear-gradient(-45deg, transparent 75%, #eee 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0;
        }
      `}</style>
    </div>
  );
}
