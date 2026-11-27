import React, { useRef, useState } from "react";
import {
  Award,
  Check,
  Copy,
  Download,
  ExternalLink,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";

function buildPostText(badge, athleteName, rankName, xpPoints) {
  const who = athleteName ? `${athleteName} just unlocked` : "I just unlocked";
  const rankLine = rankName ? ` | Rank: ${rankName} (${xpPoints || 0} XP)` : "";
  return `🏅 ${who} the "${badge.name}" badge (+${badge.points} XP) on KhelGujarat!${rankLine}\n\n${badge.description}\n\n#KhelGujarat #SportsAuthorityOfGujarat #AthleteJourney`;
}

function downloadBadgePng(badge, athleteName, rankName, xpPoints) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, "#064e3b");
  grad.addColorStop(1, "#007D40");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // Inner card
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(72, 72, 936, 936, 40);
  ctx.fill();

  // Header tag
  ctx.fillStyle = "#047857";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SPORTS AUTHORITY OF GUJARAT · KHELGUJARAT", 540, 165);

  // Medal circle
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(540, 340, 105, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = "#b45309";
  ctx.font = "bold 76px sans-serif";
  ctx.fillText("★", 540, 366);

  // Badge label
  ctx.fillStyle = "#065f46";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("BADGE UNLOCKED", 540, 505);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText(badge.name, 540, 575);

  ctx.fillStyle = "#047857";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText(`+${badge.points} XP`, 540, 632);

  // Description wrap
  ctx.fillStyle = "#475569";
  ctx.font = "28px sans-serif";
  const words = String(badge.description || "").split(" ");
  let line = "";
  let y = 705;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 760) {
      ctx.fillText(line, 540, y);
      line = w;
      y += 40;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 540, y);

  // Footer athlete & rank
  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.roundRect(140, 825, 800, 115, 24);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(athleteName || "KhelGujarat Athlete", 540, 875);

  ctx.fillStyle = "#64748b";
  ctx.font = "24px sans-serif";
  ctx.fillText(`${rankName || "Bronze Athlete"} · ${xpPoints || 0} Total XP`, 540, 916);

  const link = document.createElement("a");
  link.download = `${badge.badgeKey || "badge"}-khelgujarat.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function BadgeShareModal({
  badge,
  athleteName,
  rankName,
  xpPoints,
  onClose,
}) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  if (!badge) return null;

  const postText = buildPostText(badge, athleteName, rankName, xpPoints);
  const encoded = encodeURIComponent(postText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${badge.name} — KhelGujarat`, text: postText });
      } catch {
        // cancelled
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-emerald-700" />
            <h3 className="font-extrabold text-slate-900">Share Achievement Badge</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Shareable Post Preview Card */}
          <div
            ref={cardRef}
            className="rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 p-5 text-white shadow-md"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
              Sports Authority of Gujarat · KhelGujarat
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow">
                <Award className="h-8 w-8" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">
                  Badge Achieved · +{badge.points} XP
                </span>
                <h4 className="mt-1 text-xl font-extrabold">{badge.name}</h4>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-emerald-50/90">{badge.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-xs">
              <span className="font-bold">{athleteName || "KhelGujarat Athlete"}</span>
              <span className="text-emerald-200">
                {rankName || "Bronze Athlete"} · {xpPoints || 0} XP
              </span>
            </div>
          </div>

          {/* Caption Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 whitespace-pre-line">
            {postText}
          </div>

          {/* Social & Share Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={`https://wa.me/?text=${encoded}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" />
              Share on WhatsApp
            </a>

            <a
              href={`https://twitter.com/intent/tweet?text=${encoded}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800"
            >
              <ExternalLink className="h-4 w-4" />
              Post on X / Twitter
            </a>

            <a
              href={`https://www.linkedin.com/feed/?shareActive=true&mini=true&text=${encoded}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:brightness-95"
            >
              <ExternalLink className="h-4 w-4" />
              Share on LinkedIn
            </a>

            <button
              type="button"
              onClick={() => downloadBadgePng(badge, athleteName, rankName, xpPoints)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download Post Image
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied post text!" : "Copy post text"}
            </button>
            {typeof navigator !== "undefined" && navigator.share ? (
              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
              >
                <Share2 className="h-3.5 w-3.5" /> More Apps
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
