import React, { useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { api } from "../../API/client";

export default function UploadImageField({ label = "Image", value = "", onChange, help = "JPEG, PNG or WebP up to 8 MB" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const result = await api.upload("/api/uploads/image", form);
      onChange(result.data.url);
    } catch (uploadError) { setError(uploadError.message); }
    finally { setUploading(false); event.target.value = ""; }
  };
  return <div>
    <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
    {value ? <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><img src={value} alt="Uploaded preview" className="h-40 w-full object-cover" /><button type="button" onClick={() => onChange("")} className="absolute right-2 top-2 rounded-lg bg-white/95 p-2 text-red-600 shadow"><Trash2 className="h-4 w-4" /></button></div> : <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center hover:border-emerald-500 hover:bg-emerald-50/40">
      {uploading ? <Loader2 className="h-6 w-6 animate-spin text-emerald-600" /> : <ImagePlus className="h-6 w-6 text-slate-400" />}
      <span className="mt-2 text-sm font-bold text-slate-700">{uploading ? "Uploading…" : "Choose image"}</span><span className="mt-1 text-xs text-slate-500">{help}</span>
      <input disabled={uploading} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
    </label>}
    {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : null}
  </div>;
}

export function MultiImageField({
  label = "Photographs",
  values = [],
  onChange,
  max = 8,
  help = "Select up to 8 JPEG, PNG or WebP images (max 8 MB each)",
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const current = Array.isArray(values) ? values.filter(Boolean) : [];

  const uploadMany = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const slotsLeft = Math.max(0, max - current.length);
    if (!slotsLeft) {
      setError(`Maximum ${max} images allowed.`);
      event.target.value = "";
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = [];
      for (const file of files.slice(0, slotsLeft)) {
        const form = new FormData();
        form.append("file", file);
        const result = await api.upload("/api/uploads/image", form);
        if (result?.data?.url) uploaded.push(result.data.url);
      }
      onChange([...current, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="block text-xs font-bold text-slate-600">{label}</span>
        <span className="text-[11px] font-semibold text-slate-400">
          {current.length}/{max}
        </span>
      </div>
      {current.length > 0 ? (
        <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {current.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={url} alt={`Photo ${idx + 1}`} className="h-24 w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(current.filter((_, i) => i !== idx))}
                className="absolute right-1.5 top-1.5 rounded-lg bg-white/95 p-1.5 text-red-600 shadow hover:bg-red-50"
                title="Remove photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {current.length < max ? (
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center hover:border-emerald-500 hover:bg-emerald-50/40">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> : <ImagePlus className="h-5 w-5 text-slate-400" />}
          <span className="mt-1.5 text-xs font-bold text-slate-700">
            {uploading ? "Uploading images…" : "Add multiple photos"}
          </span>
          <span className="mt-0.5 text-[11px] text-slate-500">{help}</span>
          <input
            disabled={uploading}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={uploadMany}
          />
        </label>
      ) : null}
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
