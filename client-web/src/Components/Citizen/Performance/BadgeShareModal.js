import React, { useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";

const TIER_COLORS = {
  bronze: { primary: "#d97706", secondary: "#78350f", glow: "#fde68a" },
  silver: { primary: "#94a3b8", secondary: "#334155", glow: "#e2e8f0" },
  gold: { primary: "#eab308", secondary: "#854d0e", glow: "#fef08a" },
  platinum: { primary: "#06b6d4", secondary: "#155e75", glow: "#a5f3fc" },
  diamond: { primary: "#6366f1", secondary: "#312e81", glow: "#c7d2fe" },
  crown: { primary: "#a855f7", secondary: "#581c87", glow: "#e9d5ff" },
};

function buildPostText(badge, athleteName, rankName, xpPoints) {
  const who = athleteName ? `${athleteName} unlocked` : "Unlocked";
  return `🏆 ${who} the "${badge.name}" badge (+${badge.points} XP) on KhelGujarat!\nRank: ${rankName || "Bronze Athlete"} (${xpPoints || 0} XP)\n\n#KhelGujarat #SportsAuthorityOfGujarat`;
}

function drawHexagon(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function renderBadgeCanvas(badge, athleteName, rankName, xpPoints) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const palette = TIER_COLORS[badge.tier] || TIER_COLORS.gold;

  // Sleek dark slate + emerald LeetCode-style background
  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, "#0f172a");
  bg.addColorStop(0.55, "#064e3b");
  bg.addColorStop(1, "#022c22");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  // Subtle decorative radial glow behind hexagon
  const rad = ctx.createRadialGradient(540, 390, 20, 540, 390, 260);
  rad.addColorStop(0, `${palette.glow}55`);
  rad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rad;
  ctx.fillRect(180, 100, 720, 580);

  // Outer subtle card border
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(48, 48, 984, 984, 44);
  ctx.stroke();

  // Header branding
  ctx.fillStyle = "#6ee7b7";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SPORTS AUTHORITY OF GUJARAT · KHELGUJARAT", 540, 130);

  // LeetCode-style outer hexagon
  drawHexagon(ctx, 540, 385, 165);
  const hexGrad = ctx.createLinearGradient(390, 220, 690, 550);
  hexGrad.addColorStop(0, palette.glow);
  hexGrad.addColorStop(0.5, palette.primary);
  hexGrad.addColorStop(1, palette.secondary);
  ctx.fillStyle = hexGrad;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.stroke();

  // Inner hexagon
  drawHexagon(ctx, 540, 385, 132);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.strokeStyle = palette.glow;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Trophy / Star emblem inside hexagon
  ctx.fillStyle = palette.glow;
  ctx.font = "bold 110px sans-serif";
  ctx.fillText("★", 540, 422);

  // Tier pill
  ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
  ctx.beginPath();
  ctx.roundRect(380, 588, 320, 44, 22);
  ctx.fill();
  ctx.fillStyle = "#6ee7b7";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(`${String(badge.tier || "gold").toUpperCase()} BADGE · +${badge.points} XP`, 540, 617);

  // Badge Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 54px sans-serif";
  ctx.fillText(badge.name, 540, 695);

  // Description wrap
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "28px sans-serif";
  const words = String(badge.description || "").split(" ");
  let line = "";
  let y = 755;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 780) {
      ctx.fillText(line, 540, y);
      line = w;
      y += 38;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 540, y);

  // Footer Athlete Strip
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.roundRect(120, 865, 840, 110, 24);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText(athleteName || "KhelGujarat Athlete", 540, 912);

  ctx.fillStyle = "#a7f3d0";
  ctx.font = "24px sans-serif";
  const dateLabel = badge.awardedAt
    ? `Unlocked ${new Date(badge.awardedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
    : "Verified Achievement";
  ctx.fillText(`${rankName || "Bronze Athlete"} · ${xpPoints || 0} XP · ${dateLabel}`, 540, 950);

  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

export default function BadgeShareModal({
  badge,
  athleteName,
  rankName,
  xpPoints,
  onClose,
}) {
  const [statusMsg, setStatusMsg] = useState("");

  if (!badge) return null;

  const palette = TIER_COLORS[badge.tier] || TIER_COLORS.gold;
  const postText = buildPostText(badge, athleteName, rankName, xpPoints);
  const encoded = encodeURIComponent(postText);

  const flash = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 2600);
  };

  const handleDownload = () => {
    const canvas = renderBadgeCanvas(badge, athleteName, rankName, xpPoints);
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${badge.badgeKey || "badge"}-khelgujarat.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    flash("Badge PNG downloaded!");
  };

  const handleCopyImage = async () => {
    try {
      const canvas = renderBadgeCanvas(badge, athleteName, rankName, xpPoints);
      const blob = canvas ? await canvasToBlob(canvas) : null;
      if (blob && window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
        flash("Badge image copied! Paste (Ctrl+V) in WhatsApp / LinkedIn / X.");
        return;
      }
      await navigator.clipboard.writeText(postText);
      flash("Post text copied!");
    } catch {
      handleDownload();
    }
  };

  const handleShareImageFile = async () => {
    try {
      const canvas = renderBadgeCanvas(badge, athleteName, rankName, xpPoints);
      const blob = canvas ? await canvasToBlob(canvas) : null;
      if (blob && navigator.share) {
        const file = new File([blob], `${badge.badgeKey || "badge"}-khelgujarat.png`, {
          type: "image/png",
        });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${badge.name} — KhelGujarat`,
            text: postText,
          });
          return;
        }
      }
      handleDownload();
    } catch {
      // user cancelled or unsupported -> download fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-emerald-700" />
            <h3 className="font-extrabold text-slate-900">Share Badge Post</h3>
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
          {/* LeetCode-style Hexagonal Badge Preview Card */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-emerald-900 p-6 text-center text-white shadow-lg border border-white/10">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
              Sports Authority of Gujarat · KhelGujarat
            </p>

            {/* Hexagonal Badge Emblem */}
            <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-24 w-24 drop-shadow-lg">
                <defs>
                  <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={palette.glow} />
                    <stop offset="50%" stopColor={palette.primary} />
                    <stop offset="100%" stopColor={palette.secondary} />
                  </linearGradient>
                </defs>
                <polygon
                  points="50,3 93,27 93,73 50,97 7,73 7,27"
                  fill="url(#hexGrad)"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <polygon
                  points="50,13 84,32 84,68 50,87 16,68 16,32"
                  fill="#0f172a"
                  stroke={palette.glow}
                  strokeWidth="1.5"
                />
                <text
                  x="50"
                  y="60"
                  textAnchor="middle"
                  fill={palette.glow}
                  fontSize="34"
                  fontWeight="bold"
                >
                  ★
                </text>
              </svg>
            </div>

            <span className="mt-2 inline-block rounded-full bg-emerald-500/20 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
              {badge.tier || "gold"} badge · +{badge.points} XP
            </span>
            <h4 className="mt-2 text-xl font-extrabold">{badge.name}</h4>
            <p className="mt-1 text-xs text-slate-300">{badge.description}</p>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5 text-xs">
              <span className="font-bold">{athleteName || "KhelGujarat Athlete"}</span>
              <span className="text-emerald-200">
                {rankName || "Bronze Athlete"} · {xpPoints || 0} XP
              </span>
            </div>
          </div>

          {statusMsg ? (
            <p className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
              <Check className="h-3.5 w-3.5" /> {statusMsg}
            </p>
          ) : null}

          {/* Primary Image Share Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleShareImageFile}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-brand-dark"
            >
              <Share2 className="h-4 w-4" />
              Share Badge Image
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
            >
              <ImageIcon className="h-4 w-4 text-emerald-700" />
              Copy Badge Image
            </button>

            <a
              href={`https://wa.me/?text=${encoded}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </button>

            <a
              href={`https://twitter.com/intent/tweet?text=${encoded}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              X / Twitter
            </a>

            <a
              href={`https://www.linkedin.com/feed/?shareActive=true&mini=true&text=${encoded}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-4 py-2 text-xs font-bold text-white hover:brightness-95"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
