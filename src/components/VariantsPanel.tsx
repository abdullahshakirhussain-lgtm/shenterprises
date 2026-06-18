"use client";
import { useState, useRef, useEffect } from "react";

type Variant = { id: number; type: string; name: string; imageUrl: string | null; sortOrder: number; price?: number | null; salePrice?: number | null };
type CropBox = { x: number; y: number; width: number; height: number; name: string; confirmed: boolean };

export default function VariantsPanel({
  productId, productName, initialVariants, imageUrl
}: {
  productId: number;
  productName: string;
  initialVariants: Variant[];
  imageUrl?: string | null;
}) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [tab, setTab] = useState<"colors" | "sizes" | "lengths" | "packs">("colors");

  // Color / crop state — defaults to the main product image
  const [cropImage, setCropImage] = useState<string>(imageUrl || "");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [usingProductImage, setUsingProductImage] = useState(!!imageUrl);
  const [boxes, setBoxes] = useState<CropBox[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Re-sync when the product image prop changes (e.g. after saving the main form)
  useEffect(() => {
    if (imageUrl && usingProductImage) {
      setCropImage(imageUrl);
    }
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag state for drawing new box
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragBox, setDragBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Size state
  const [newSize, setNewSize] = useState("");
  const [addingSize, setAddingSize] = useState(false);

  // Length state — structured: number + unit
  const [newLengthQty, setNewLengthQty] = useState("");
  const [newLengthUnit, setNewLengthUnit] = useState("yards");
  const [addingLength, setAddingLength] = useState(false);

  // Pack state — name like "Single piece" or "Pack of 100"
  const [newPackName, setNewPackName] = useState("");
  const [addingPack, setAddingPack] = useState(false);

  // Manual color state — name only (image optional, added later via VariantRow)
  const [newColorName, setNewColorName] = useState("");
  const [addingColor, setAddingColor] = useState(false);

  const colorVariants = variants.filter(v => v.type === "color");
  const sizeVariants = variants.filter(v => v.type === "size");
  const lengthVariants = variants.filter(v => v.type === "length");
  const packVariants = variants.filter(v => v.type === "pack");

  // Upload crop source image
  async function uploadCropSource(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error);
    return j.url as string;
  }

  async function handleCropImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropImage(URL.createObjectURL(file));
    setUsingProductImage(false);
    setBoxes([]);
  }

  function resetToProductImage() {
    if (!imageUrl) return;
    setCropImage(imageUrl);
    setCropFile(null);
    setUsingProductImage(true);
    setBoxes([]);
    setMsg("");
  }

  // Cancel an in-progress AI analysis
  function cancelAnalysis() {
    abortRef.current?.abort();
    abortRef.current = null;
    setAnalyzing(false);
    setMsg("Analysis cancelled.");
  }

  // Analyze with GPT-4o
  async function analyzeImage() {
    if (!cropImage) return;
    setAnalyzing(true); setMsg(""); setBoxes([]);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      let url = cropImage;
      // If it's a blob URL, upload first
      if (url.startsWith("blob:") && cropFile) {
        url = await uploadCropSource(cropFile);
        setCropImage(url);
        setCropFile(null);
      }
      const res = await fetch("/api/admin/ai/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url.startsWith("/") ? window.location.origin + url : url, productName }),
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBoxes((data.variants as any[]).map(v => ({ ...v, confirmed: false })));
      setMsg(`✓ AI detected ${data.variants.length} color variant${data.variants.length === 1 ? "" : "s"}. Review the boxes, then click Save Variants.`);
    } catch (e: any) {
      if (e.name === "AbortError") return; // handled by cancelAnalysis
      setMsg("Error: " + e.message);
    } finally {
      abortRef.current = null;
      setAnalyzing(false);
    }
  }

  // ----- Interactive box editing (move + resize) -----
  // interaction = null when idle, otherwise describes what the user is doing
  type Interaction =
    | { kind: "draw" }                                          // drawing a new box
    | { kind: "move"; idx: number; offsetX: number; offsetY: number; orig: CropBox }
    | { kind: "resize"; idx: number; handle: "nw" | "ne" | "sw" | "se"; orig: CropBox };
  const [interaction, setInteraction] = useState<Interaction | null>(null);

  function getRelativePos(e: React.MouseEvent | MouseEvent) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  // Start dragging the box body to move it
  function onBoxMouseDown(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    e.preventDefault();
    const pos = getRelativePos(e);
    const box = boxes[idx];
    setInteraction({
      kind: "move",
      idx,
      offsetX: pos.x - box.x,
      offsetY: pos.y - box.y,
      orig: { ...box },
    });
  }

  // Start dragging a corner handle to resize
  function onHandleMouseDown(e: React.MouseEvent, idx: number, handle: "nw" | "ne" | "sw" | "se") {
    e.stopPropagation();
    e.preventDefault();
    setInteraction({ kind: "resize", idx, handle, orig: { ...boxes[idx] } });
  }

  // Background mousedown — start drawing a new box
  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".box-handle")) return;
    const pos = getRelativePos(e);
    setDragging(true);
    setDragStart(pos);
    setDragBox(null);
    setInteraction({ kind: "draw" });
  }

  function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }

  function onMouseMove(e: React.MouseEvent) {
    if (!interaction) return;
    const pos = getRelativePos(e);

    if (interaction.kind === "draw" && dragging) {
      setDragBox({
        x: Math.min(dragStart.x, pos.x),
        y: Math.min(dragStart.y, pos.y),
        w: Math.abs(pos.x - dragStart.x),
        h: Math.abs(pos.y - dragStart.y),
      });
      return;
    }

    if (interaction.kind === "move") {
      const { idx, offsetX, offsetY, orig } = interaction;
      const newX = clamp(pos.x - offsetX, 0, 100 - orig.width);
      const newY = clamp(pos.y - offsetY, 0, 100 - orig.height);
      setBoxes(bs => bs.map((b, i) => i === idx ? { ...b, x: newX, y: newY } : b));
      return;
    }

    if (interaction.kind === "resize") {
      const { idx, handle, orig } = interaction;
      let { x, y, width, height } = orig;
      const right = orig.x + orig.width;
      const bottom = orig.y + orig.height;
      const MIN = 2;
      if (handle === "se") {
        width = clamp(pos.x - x, MIN, 100 - x);
        height = clamp(pos.y - y, MIN, 100 - y);
      } else if (handle === "ne") {
        width = clamp(pos.x - x, MIN, 100 - x);
        y = clamp(pos.y, 0, bottom - MIN);
        height = bottom - y;
      } else if (handle === "sw") {
        x = clamp(pos.x, 0, right - MIN);
        width = right - x;
        height = clamp(pos.y - y, MIN, 100 - y);
      } else if (handle === "nw") {
        x = clamp(pos.x, 0, right - MIN);
        y = clamp(pos.y, 0, bottom - MIN);
        width = right - x;
        height = bottom - y;
      }
      setBoxes(bs => bs.map((b, i) => i === idx ? { ...b, x, y, width, height } : b));
    }
  }

  function onMouseUp(_e: React.MouseEvent) {
    if (interaction?.kind === "draw" && dragging && dragBox) {
      if (dragBox.w > 3 && dragBox.h > 3) {
        const name = prompt("Color name for this crop?", "");
        if (name) {
          setBoxes(b => [...b, { x: dragBox.x, y: dragBox.y, width: dragBox.w, height: dragBox.h, name, confirmed: false }]);
        }
      }
    }
    setDragging(false);
    setDragBox(null);
    setInteraction(null);
  }

  function updateBoxName(i: number, name: string) {
    setBoxes(b => b.map((box, idx) => idx === i ? { ...box, name } : box));
  }

  function removeBox(i: number) {
    setBoxes(b => b.filter((_, idx) => idx !== i));
  }

  // Save all boxes as color variants
  async function saveColorVariants() {
    if (boxes.length === 0) return;
    setSaving(true); setMsg("");
    try {
      let sourceUrl = cropImage;
      if (sourceUrl.startsWith("blob:") && cropFile) {
        sourceUrl = await uploadCropSource(cropFile);
        setCropImage(sourceUrl);
        setCropFile(null);
      }
      // Make it absolute for server-side fetch
      const absUrl = sourceUrl.startsWith("/") ? window.location.origin + sourceUrl : sourceUrl;

      const created: Variant[] = [];
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        // Crop image server-side
        const cropRes = await fetch("/api/admin/ai/crop-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: absUrl, x: box.x, y: box.y, width: box.width, height: box.height })
        });
        const cropData = await cropRes.json();
        if (!cropRes.ok) throw new Error(cropData.error);

        // Save variant to DB
        const varRes = await fetch("/api/admin/products/variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, type: "color", name: box.name, imageUrl: cropData.url, sortOrder: i })
        });
        const varData = await varRes.json();
        if (!varRes.ok) throw new Error(varData.error);
        created.push(varData);
      }
      setVariants(v => [...v, ...created]);
      setBoxes([]);
      setMsg(`✓ ${created.length} color variant${created.length === 1 ? "" : "s"} saved!`);
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteVariant(id: number) {
    await fetch(`/api/admin/products/variants?id=${id}`, { method: "DELETE" });
    setVariants(v => v.filter(x => x.id !== id));
  }

  async function updateVariantPrice(id: number, field: "price" | "salePrice", value: string) {
    const parsed = value === "" ? null : parseFloat(value);
    // Optimistic update
    setVariants(v => v.map(x => x.id === id ? { ...x, [field]: parsed } : x));
    await fetch("/api/admin/products/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value === "" ? null : value }),
    });
  }

  async function updateVariantImage(id: number, file: File) {
    // Upload the image
    const fd = new FormData(); fd.append("file", file);
    const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const j = await up.json();
    if (!up.ok) { setMsg("Image upload failed: " + (j.error || "")); return; }
    // Save URL to the variant
    const res = await fetch("/api/admin/products/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, imageUrl: j.url }),
    });
    if (res.ok) {
      setVariants(v => v.map(x => x.id === id ? { ...x, imageUrl: j.url } : x));
    }
  }

  async function addSize() {
    if (!newSize.trim()) return;
    setAddingSize(true);
    const res = await fetch("/api/admin/products/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, type: "size", name: newSize.trim(), sortOrder: sizeVariants.length })
    });
    const data = await res.json();
    if (res.ok) { setVariants(v => [...v, data]); setNewSize(""); }
    setAddingSize(false);
  }

  async function addLength() {
    const qty = parseFloat(newLengthQty);
    if (!qty || !newLengthUnit) return;
    setAddingLength(true);
    const name = `${qty} ${newLengthUnit}`;
    const res = await fetch("/api/admin/products/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, type: "length", name, sortOrder: lengthVariants.length })
    });
    const data = await res.json();
    if (res.ok) { setVariants(v => [...v, data]); setNewLengthQty(""); }
    setAddingLength(false);
  }

  async function addPack() {
    if (!newPackName.trim()) return;
    setAddingPack(true);
    const res = await fetch("/api/admin/products/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, type: "pack", name: newPackName.trim(), sortOrder: packVariants.length })
    });
    const data = await res.json();
    if (res.ok) { setVariants(v => [...v, data]); setNewPackName(""); }
    setAddingPack(false);
  }

  async function addColorManual() {
    if (!newColorName.trim()) return;
    setAddingColor(true);
    const res = await fetch("/api/admin/products/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, type: "color", name: newColorName.trim(), sortOrder: colorVariants.length })
    });
    const data = await res.json();
    if (res.ok) { setVariants(v => [...v, data]); setNewColorName(""); }
    setAddingColor(false);
  }

  return (
    <div className="card p-5 max-w-3xl">
      <h2 className="font-semibold text-lg text-brand-900 mb-1">Product Variants</h2>
      <p className="text-sm text-brand-600 mb-4">Add color variants (with AI cropping) and/or size options. Customers will see these as selectors on the product page.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-brand-200">
        <button onClick={() => setTab("colors")} className={`pb-2 px-1 text-sm font-medium border-b-2 transition ${tab === "colors" ? "border-brand-600 text-brand-900" : "border-transparent text-brand-500"}`}>
          🎨 Colors ({colorVariants.length})
        </button>
        <button onClick={() => setTab("sizes")} className={`pb-2 px-1 text-sm font-medium border-b-2 transition ${tab === "sizes" ? "border-brand-600 text-brand-900" : "border-transparent text-brand-500"}`}>
          📏 Sizes ({sizeVariants.length})
        </button>
        <button onClick={() => setTab("lengths" as any)} className={`pb-2 px-1 text-sm font-medium border-b-2 transition ${tab === ("lengths" as any) ? "border-brand-600 text-brand-900" : "border-transparent text-brand-500"}`}>
          📐 Lengths ({lengthVariants.length})
        </button>
        <button onClick={() => setTab("packs" as any)} className={`pb-2 px-1 text-sm font-medium border-b-2 transition ${tab === ("packs" as any) ? "border-brand-600 text-brand-900" : "border-transparent text-brand-500"}`}>
          📦 Packs ({packVariants.length})
        </button>
      </div>

      {tab === "colors" && (
        <div className="space-y-4">
          {/* Existing color variants */}
          {colorVariants.length > 0 && (
            <div>
              <p className="text-sm font-medium text-brand-800 mb-2">Saved colors</p>
              <p className="text-xs text-brand-500 mb-3">Set a price to override the base price when this color is picked. Click the image area to add or change the swatch image.</p>
              <div className="space-y-2">
                {colorVariants.map(v => (
                  <VariantRow key={v.id} variant={v} onDelete={deleteVariant} onPriceChange={updateVariantPrice} onImageChange={updateVariantImage} showImage />
                ))}
              </div>
            </div>
          )}

          {/* Quick manual add — no image required */}
          <div className="border border-brand-200 rounded-lg p-4">
            <p className="font-medium text-brand-800 mb-1">Add a color manually</p>
            <p className="text-xs text-brand-600 mb-3">Just a name. You can add the swatch image later by clicking the image area on the saved row.</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <input className="input" placeholder='e.g. "Black", "Navy Blue", "Crimson"…'
                  value={newColorName} onChange={e => setNewColorName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addColorManual())} />
              </div>
              <button onClick={addColorManual} disabled={addingColor || !newColorName.trim()} className="btn-primary">
                {addingColor ? "Adding…" : "Add"}
              </button>
            </div>
          </div>

          {/* AI Crop Tool */}
          <div className="border border-brand-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-brand-800">AI Color Crop Tool</p>
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded">Powered by GPT-4o</span>
            </div>
            <p className="text-xs text-brand-600">By default the main product image is used. Upload a different image if needed, then let AI detect each color or draw boxes manually.</p>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">
                  {usingProductImage && imageUrl ? "Using main product image" : "Custom uploaded image"}
                </label>
                {!usingProductImage && imageUrl && (
                  <button type="button" onClick={resetToProductImage} className="text-xs text-brand-600 underline">
                    ↺ Use product image
                  </button>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleCropImageChange} className="input"
                placeholder={usingProductImage ? "Upload a different image (optional)" : ""} />
              {usingProductImage && (
                <p className="text-xs text-brand-500 mt-1">Optional — upload a different image only if the product image doesn't show all color variants.</p>
              )}
            </div>

            {cropImage && (
              <>
                <div className="flex gap-2 items-center">
                  {analyzing ? (
                    <>
                      <button onClick={cancelAnalysis} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm">
                        ✕ Cancel analysis
                      </button>
                      <span className="text-xs text-brand-600 self-center animate-pulse">🔍 GPT-4o is analyzing the image…</span>
                    </>
                  ) : (
                    <>
                      <button onClick={analyzeImage} className="btn-primary text-sm">
                        ✨ Detect colors with AI
                      </button>
                      <span className="text-xs text-brand-500 self-center">or draw boxes manually on the image below</span>
                    </>
                  )}
                </div>

                {/* Image with crop boxes overlay */}
                <div
                  ref={containerRef}
                  className="relative select-none cursor-crosshair rounded overflow-hidden border border-brand-200"
                  style={{ userSelect: "none" }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img ref={imgRef} src={cropImage} alt="crop source" className="w-full block pointer-events-none" draggable={false} />

                  {/* Detected / drawn boxes — draggable to move, corner handles to resize */}
                  {boxes.map((box, i) => (
                    <div
                      key={i}
                      className="box-handle absolute border-2 border-yellow-400 bg-yellow-400/10 cursor-move"
                      style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` }}
                      onMouseDown={(e) => onBoxMouseDown(e, i)}
                    >
                      {/* Name label — bar on top */}
                      <div
                        className="absolute -top-6 left-0 flex items-center gap-1 bg-yellow-400 px-1 rounded text-xs text-yellow-900 whitespace-nowrap"
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <input
                          value={box.name}
                          onChange={e => updateBoxName(i, e.target.value)}
                          className="bg-transparent outline-none w-24 font-medium cursor-text"
                          onClick={e => e.stopPropagation()}
                        />
                        <button onClick={() => removeBox(i)} className="text-red-700 font-bold ml-1">✕</button>
                      </div>
                      {/* Resize handles — four corners */}
                      {(["nw", "ne", "sw", "se"] as const).map(h => (
                        <div
                          key={h}
                          className="absolute w-3 h-3 bg-yellow-400 border border-yellow-700 rounded-sm"
                          style={{
                            left: h.includes("w") ? "-6px" : "auto",
                            right: h.includes("e") ? "-6px" : "auto",
                            top:   h.includes("n") ? "-6px" : "auto",
                            bottom:h.includes("s") ? "-6px" : "auto",
                            cursor: (h === "nw" || h === "se") ? "nwse-resize" : "nesw-resize",
                          }}
                          onMouseDown={(e) => onHandleMouseDown(e, i, h)}
                        />
                      ))}
                    </div>
                  ))}

                  {/* Active drag box */}
                  {dragBox && dragBox.w > 1 && (
                    <div className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
                      style={{ left: `${dragBox.x}%`, top: `${dragBox.y}%`, width: `${dragBox.w}%`, height: `${dragBox.h}%` }} />
                  )}
                </div>

                {boxes.length > 0 && (
                  <button onClick={saveColorVariants} disabled={saving} className="btn-primary">
                    {saving ? "Cropping & saving…" : `💾 Save ${boxes.length} color variant${boxes.length === 1 ? "" : "s"}`}
                  </button>
                )}
              </>
            )}

            {msg && (
              <div className={`text-sm p-2 rounded ${msg.startsWith("✓") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg}</div>
            )}
          </div>
        </div>
      )}

      {tab === "sizes" && (
        <div className="space-y-4">
          {sizeVariants.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-brand-500">Leave price empty to use the product's base price. The highest-priced selected variant wins.</p>
              {sizeVariants.map(v => (
                <VariantRow key={v.id} variant={v} onDelete={deleteVariant} onPriceChange={updateVariantPrice} onImageChange={updateVariantImage} showImage />
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-500 italic">No sizes added yet.</p>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label">Add size</label>
              <input className="input" placeholder="e.g. Small, Medium, Large, XL, 10mm…"
                value={newSize} onChange={e => setNewSize(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSize())} />
            </div>
            <button onClick={addSize} disabled={addingSize || !newSize.trim()} className="btn-primary">
              {addingSize ? "Adding…" : "Add"}
            </button>
          </div>
          <p className="text-xs text-brand-500">Press Enter or click Add. You can add multiple sizes one at a time.</p>
        </div>
      )}

      {tab === "lengths" && (
        <div className="space-y-4">
          {lengthVariants.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-brand-500">Leave price empty to use the product's base price. The highest-priced selected variant wins.</p>
              {lengthVariants.map(v => (
                <VariantRow key={v.id} variant={v} onDelete={deleteVariant} onPriceChange={updateVariantPrice} onImageChange={updateVariantImage} showImage />
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-500 italic">No lengths added yet.</p>
          )}

          <div className="flex gap-2 items-end">
            <div className="w-32">
              <label className="label">Quantity</label>
              <input type="number" min="0" step="0.01" className="input" placeholder="e.g. 144"
                value={newLengthQty} onChange={e => setNewLengthQty(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addLength())} />
            </div>
            <div className="w-36">
              <label className="label">Unit</label>
              <select className="input" value={newLengthUnit} onChange={e => setNewLengthUnit(e.target.value)}>
                <option value="yards">yards</option>
                <option value="meters">meters</option>
                <option value="feet">feet</option>
                <option value="cm">cm</option>
              </select>
            </div>
            <button onClick={addLength} disabled={addingLength || !newLengthQty.trim()} className="btn-primary">
              {addingLength ? "Adding…" : "Add"}
            </button>
          </div>
          <p className="text-xs text-brand-500">Use this for products sold in different lengths (e.g. 36 yards vs 144 yards of the same elastic). Customers will see a dropdown.</p>
        </div>
      )}

      {tab === "packs" && (
        <div className="space-y-4">
          {packVariants.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-brand-500">Use this when the product can be bought as individual pieces OR as a pack. Each row has its own price.</p>
              {packVariants.map(v => (
                <VariantRow key={v.id} variant={v} onDelete={deleteVariant} onPriceChange={updateVariantPrice} onImageChange={updateVariantImage} showImage />
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-500 italic">No pack options added yet.</p>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label">Add pack option</label>
              <input className="input" placeholder='e.g. "Single piece", "Pack of 100", "Box of 12"…'
                value={newPackName} onChange={e => setNewPackName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPack())} />
            </div>
            <button onClick={addPack} disabled={addingPack || !newPackName.trim()} className="btn-primary">
              {addingPack ? "Adding…" : "Add"}
            </button>
          </div>
          <p className="text-xs text-brand-500">Example: add <strong>&quot;Single piece&quot;</strong> at Rs. 20 and <strong>&quot;Pack of 100&quot;</strong> at Rs. 1,500. Customer picks which one and your cart line shows it clearly.</p>
        </div>
      )}
    </div>
  );
}

function VariantRow({
  variant, onDelete, onPriceChange, onImageChange, showImage,
}: {
  variant: Variant;
  onDelete: (id: number) => void;
  onPriceChange: (id: number, field: "price" | "salePrice", value: string) => void;
  onImageChange?: (id: number, file: File) => void;
  showImage?: boolean;
}) {
  const [price, setPrice] = useState<string>(variant.price != null ? String(variant.price) : "");
  const [salePrice, setSalePrice] = useState<string>(variant.salePrice != null ? String(variant.salePrice) : "");
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !onImageChange) return;
    setUploading(true);
    try { await onImageChange(variant.id, f); }
    finally { setUploading(false); e.target.value = ""; }
  }

  return (
    <div className="flex items-center gap-3 p-2 bg-white border border-brand-200 rounded">
      {showImage && (
        <label
          className="relative w-12 h-12 rounded shrink-0 overflow-hidden cursor-pointer group"
          title={variant.imageUrl ? "Click to change image" : "Click to add image"}
        >
          {variant.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={variant.imageUrl} alt={variant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-brand-100 grid place-items-center text-sm text-brand-500 border border-dashed border-brand-300">
              {variant.name[0]?.toUpperCase() || "+"}
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 grid place-items-center text-white text-[10px] transition-opacity">
            {uploading ? "…" : (variant.imageUrl ? "Change" : "Add")}
          </div>
          {onImageChange && (
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          )}
        </label>
      )}
      <div className="flex-1 text-sm font-medium text-brand-900 truncate">{variant.name}</div>
      <div className="flex items-center gap-2">
        <div>
          <label className="block text-[10px] text-brand-500 uppercase tracking-wide">Price</label>
          <input
            type="number" min="0" step="0.01"
            className="input w-24 text-sm py-1"
            placeholder="Base"
            value={price}
            onChange={e => setPrice(e.target.value)}
            onBlur={() => onPriceChange(variant.id, "price", price)}
          />
        </div>
        <div>
          <label className="block text-[10px] text-brand-500 uppercase tracking-wide">Sale</label>
          <input
            type="number" min="0" step="0.01"
            className="input w-24 text-sm py-1"
            placeholder="—"
            value={salePrice}
            onChange={e => setSalePrice(e.target.value)}
            onBlur={() => onPriceChange(variant.id, "salePrice", salePrice)}
          />
        </div>
      </div>
      <button onClick={() => onDelete(variant.id)} className="text-red-500 hover:text-red-700 text-lg px-2" title="Delete variant">✕</button>
    </div>
  );
}
