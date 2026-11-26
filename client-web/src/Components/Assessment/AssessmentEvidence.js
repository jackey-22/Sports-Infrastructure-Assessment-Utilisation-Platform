import React from "react";
import { Camera, ExternalLink, Images, MapPin } from "lucide-react";

function normalized(photo) {
  return typeof photo === "string" ? { filename: photo } : (photo || {});
}

export default function AssessmentEvidence({ photos = [] }) {
  if (!photos.length) return null;

  return (
    <section aria-label="Assessment photographic evidence" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-extrabold text-slate-900">Photographic evidence</h3>
        <p className="mt-1 text-xs text-slate-500">Stored evidence with the verified capture location.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((value, index) => {
          const photo = normalized(value);
          const hasLocation = photo.latitude != null && photo.longitude != null;
          const mapUrl = hasLocation
            ? `https://www.google.com/maps?q=${encodeURIComponent(`${photo.latitude},${photo.longitude}`)}`
            : "";
          return (
            <article key={photo.key || photo.url || `${photo.filename}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {photo.url ? (
                <a href={photo.url} target="_blank" rel="noreferrer" className="block bg-slate-100">
                  <img src={photo.url} alt={`Assessment evidence ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                </a>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-slate-400">
                  <Images className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
              <div className="space-y-2 p-3 text-xs text-slate-600">
                <p className="flex items-center gap-2 font-semibold text-slate-800">
                  {photo.source === "gallery" ? <Images className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  {photo.source === "gallery" ? "Gallery photo" : photo.source === "camera" ? "Camera photo" : photo.filename || `Photo ${index + 1}`}
                </p>
                {hasLocation ? (
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-brand-primary hover:underline">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {Number(photo.latitude).toFixed(5)}, {Number(photo.longitude).toFixed(5)}
                      {photo.distanceFromFacilityMeters != null && <><br />{photo.distanceFromFacilityMeters} m from facility</>}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <p>{photo.filename || "Legacy photo record"} · No geotag was retained.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
