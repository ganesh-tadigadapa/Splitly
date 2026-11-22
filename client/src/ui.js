import { useEffect, useId } from "react";

export const API = process.env.REACT_APP_API_URL || "http://localhost:5001";

/* ---------- money ---------- */
export function round2(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return Math.abs(v) < 0.005 ? 0 : v;
}

export function inr(n) {
  const v = Math.abs(round2(n));
  const hasFraction = !Number.isInteger(v);
  return (
    "₹" +
    v.toLocaleString("en-IN", {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/* ---------- names ---------- */
export const sameName = (a, b) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

/** Returns "You" for the current user, otherwise the member's canonical casing. */
export function displayName(name, user, members = []) {
  if (sameName(name, user?.name)) return "You";
  return members.find((m) => sameName(m, name)) || name;
}

/* ---------- dates ---------- */
export function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/* ---------- monogram ---------- */
function hueFor(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function Monogram({ name, size = "md", round = false }) {
  const letters = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`monogram monogram-${size}${round ? " round" : ""}`}
      title={name}
      style={{ "--h": hueFor(name) }}
      aria-hidden="true"
    >
      {letters}
    </span>
  );
}

/* ---------- icons (24px line set) ---------- */
const P = {
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  Food: (
    <path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7" />
  ),
  Lodging: (
    <>
      <path d="M2 20V8M2 16h20M22 20v-7a3 3 0 0 0-3-3h-8v6" />
      <circle cx="6.5" cy="12.5" r="2" />
    </>
  ),
  Transport: (
    <>
      <path d="M5 17H3v-5l2-5h11l4 5h1a2 2 0 0 1 2 2v3h-2" />
      <path d="M9 17h6" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  Activities: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </>
  ),
  Shopping: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  General: (
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 8h8M8 12h8M8 16h5" />
  ),
  Settlement: <path d="m17 1 4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />,
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  wallet: (
    <>
      <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </>
  ),
  up: <path d="M7 17 17 7M7 7h10v10" />,
  down: <path d="M17 7 7 17M17 17H7V7" />,
  scale: <path d="M12 3v18M5 21h14M3 7h18M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  trash: <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />,
  more: (
    <>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  chart: <path d="M3 3v18h18M7 16v-5M12 16V8M17 16v-9" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  whatsapp: <path d="M3 21l1.65-4.8A9 9 0 1 1 7.8 19.4zM9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2L9 9.5z" />,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  command: <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 0 0 0-6z" />,
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </>
  ),
};

/* ---------- logo: a coin split in two ---------- */
export function LogoMark({ size = 28 }) {
  // unique per instance: a gradient defined inside a hidden element can't be referenced
  const gid = `splitly-g-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
      <path transform="translate(-1.2 -1.2)" d="M22.36 9.64A9 9 0 0 0 9.64 22.36Z" fill="#06140e" />
      <path transform="translate(1.2 1.2)" d="M9.64 22.36A9 9 0 0 0 22.36 9.64Z" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ size = 28 }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span>Splitly</span>
    </span>
  );
}

/* ---------- avatar stack ---------- */
export function AvatarStack({ names = [], max = 4 }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map((n) => (
        <Monogram key={n} name={n} size="xs" round />
      ))}
      {rest > 0 && <span className="monogram monogram-xs round more">+{rest}</span>}
    </span>
  );
}

export function Icon({ name, size = 18, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {P[name] || P.General}
    </svg>
  );
}

export const CATEGORIES = ["Food", "Lodging", "Transport", "Activities", "Shopping", "General"];

/* ---------- modal shell ---------- */
export function Modal({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* ---------- categories: fixed colour per category (validated dark palette) ---------- */
export const CATEGORY_COLORS = {
  Food: "#3987e5",
  Lodging: "#d95926",
  Transport: "#199e70",
  Activities: "#c98500",
  Shopping: "#d55181",
  General: "#0ca30c",
};

export const isSettlement = (e) => e.title === "Settlement Payment";
export const expenseDate = (e) => e.date || e.createdAt;

/* ---------- more dates ---------- */
export function toInputDate(d = new Date()) {
  const x = new Date(d);
  const off = x.getTimezoneOffset();
  return new Date(x.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function dayKey(d) {
  return toInputDate(d);
}

export function relativeDay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round(
    (new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return shortDate(iso);
}

/* ---------- compact money for axes ---------- */
export function inrCompact(n) {
  const v = Math.abs(n);
  if (v >= 100000) return "₹" + +(v / 100000).toFixed(1) + "L";
  if (v >= 1000) return "₹" + +(v / 1000).toFixed(1) + "K";
  return "₹" + Math.round(v);
}

/* ---------- file download ---------- */
export function downloadFile(filename, text, type = "text/csv") {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvCell(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ---------- small hooks ---------- */
export function useOutsideClose(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, onClose]);
}

export const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl+";
