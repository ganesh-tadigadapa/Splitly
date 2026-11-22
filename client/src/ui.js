import { useEffect } from "react";

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
};

/* ---------- logo ---------- */
export function Logo({ size = 28 }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#fafafa" />
        <path d="M11 21 21 11" stroke="#09090b" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="11.5" cy="11.5" r="2.6" fill="#09090b" />
        <circle cx="20.5" cy="20.5" r="2.6" fill="#10b981" />
      </svg>
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
