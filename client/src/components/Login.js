import { useState } from "react";
import axios from "axios";
import { API, Icon, Logo } from "../ui";

/* ---------- static product preview shown beside the form ---------- */
function Avatar({ letter, hue }) {
  return (
    <span className="pv-avatar" style={{ "--h": hue }}>
      {letter}
    </span>
  );
}

function ProductPreview() {
  const balances = [
    { n: "Anu", l: "A", h: 140, v: "+₹7,740", w: 100, pos: true },
    { n: "You", l: "P", h: 260, v: "+₹230", w: 4, pos: true },
    { n: "Rahul", l: "R", h: 210, v: "−₹2,460", w: 32, pos: false },
    { n: "Karan", l: "K", h: 60, v: "−₹5,510", w: 71, pos: false },
  ];
  return (
    <div className="preview" aria-hidden="true">
      <div className="pv-card">
        <div className="pv-head">
          <span className="pv-mono">GT</span>
          <div>
            <strong>Goa Trip</strong>
            <small>4 members · ₹43,780 spent</small>
          </div>
          <span className="pv-badge pos">Owed ₹230</span>
        </div>
        <div className="pv-section">Balances</div>
        {balances.map((b) => (
          <div className="pv-bal" key={b.n}>
            <Avatar letter={b.l} hue={b.h} />
            <span className="pv-name">{b.n}</span>
            <span className="pv-track">
              <span className={`pv-fill ${b.pos ? "pos" : "neg"}`} style={{ width: `${b.w / 2}%` }} />
            </span>
            <span className={`pv-amt ${b.pos ? "pos" : "neg"}`}>{b.v}</span>
          </div>
        ))}
        <div className="pv-section">Settle up</div>
        <div className="pv-settle">
          <span>
            Karan → Anu <b>₹5,510</b>
          </span>
          <span className="pv-btn">Mark paid</span>
        </div>
        <div className="pv-settle">
          <span>
            Rahul → Anu <b>₹2,230</b>
          </span>
          <span className="pv-btn">Mark paid</span>
        </div>
      </div>

      <div className="pv-float pv-float-a">
        <span className="pv-float-icon green">
          <Icon name="camera" size={15} />
        </span>
        <div>
          <strong>Receipt scanned</strong>
          <small>Beach shack dinner · ₹3,240</small>
        </div>
      </div>

      <div className="pv-float pv-float-b">
        <span className="pv-float-icon blue">
          <Icon name="message" size={15} />
        </span>
        <div>
          <strong>Who owes the most?</strong>
          <small>Karan — ₹5,510 to Anu</small>
        </div>
      </div>
    </div>
  );
}

/* ---------- password strength (sign-up only) ---------- */
function strength(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
const STRENGTH_LABEL = ["Too short", "Weak", "Okay", "Good", "Strong"];

function Field({ id, label, icon, children, trailing }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-icon">
        <Icon name={icon} size={16} />
        {children}
        {trailing}
      </div>
    </div>
  );
}

function Login({ setUser }) {
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (isRegister) {
        await axios.post(`${API}/api/auth/register`, { name, email, password });
        setInfo("Account created — log in to get started.");
        setIsRegister(false);
        setPassword("");
      } else {
        const res = await axios.post(`${API}/api/auth/login`, { email, password });
        localStorage.setItem("token", res.data.token);
        setUser(res.data.user);
      }
    } catch (err) {
      if (!err.response) {
        setError(`Can't reach the server at ${API}. Is the backend running?`);
      } else {
        setError(err.response.data?.msg || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (register) => {
    setIsRegister(register);
    setError("");
    setInfo("");
  };

  const pwScore = strength(password);

  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="auth-bg" aria-hidden="true" />
        <Logo />

        <div className="auth-pitch">
          <span className="pill">
            <Icon name="bolt" size={13} /> AI receipt scanning built in
          </span>
          <h1>
            Split bills.
            <br />
            <span className="accent">Not friendships.</span>
          </h1>
          <p>
            Track shared costs for trips, flats and dinners. Splitly keeps a running balance and settles everyone
            up in the fewest payments.
          </p>
        </div>

        <ProductPreview />

        <ul className="auth-points">
          <li>
            <Icon name="camera" size={15} /> Scan receipts
          </li>
          <li>
            <Icon name="Settlement" size={15} /> Fewest transfers
          </li>
          <li>
            <Icon name="message" size={15} /> Ask AI anything
          </li>
        </ul>
      </aside>

      <main className="auth-main">
        <form className="auth-form" onSubmit={handleAuth}>
          <div className="auth-brand-mobile">
            <Logo size={32} />
          </div>

          <div className="auth-switcher" role="tablist" aria-label="Log in or sign up">
            <span
              role="tab"
              tabIndex={0}
              aria-selected={!isRegister}
              className={!isRegister ? "on" : ""}
              onClick={() => switchMode(false)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && switchMode(false)}
            >
              Log in
            </span>
            <span
              role="tab"
              tabIndex={0}
              aria-selected={isRegister}
              className={isRegister ? "on" : ""}
              onClick={() => switchMode(true)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && switchMode(true)}
            >
              Sign up
            </span>
          </div>

          <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
          <p className="auth-sub">
            {isRegister ? "Start splitting with your group in under a minute." : "Log in to see your balances and groups."}
          </p>

          {isRegister && (
            <Field id="name" label="Name" icon="user">
              <input
                id="name"
                className="input"
                type="text"
                placeholder="What friends call you"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </Field>
          )}

          <Field id="email" label="Email" icon="mail">
            <input
              id="email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>

          <Field
            id="password"
            label="Password"
            icon="lock"
            trailing={
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                title={showPw ? "Hide password" : "Show password"}
              >
                <Icon name={showPw ? "eyeOff" : "eye"} size={16} />
              </button>
            }
          >
            <input
              id="password"
              className="input"
              type={showPw ? "text" : "password"}
              placeholder={isRegister ? "At least 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 6 : undefined}
              required
            />
          </Field>

          {isRegister && password && (
            <div className="pw-meter" aria-live="polite">
              <div className="pw-bars">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={i <= pwScore ? `on s${pwScore}` : ""} />
                ))}
              </div>
              <span className="hint">{password.length < 6 ? STRENGTH_LABEL[0] : STRENGTH_LABEL[pwScore]}</span>
            </div>
          )}

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          {info && (
            <div className="form-note" role="status">
              {info}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? "One moment…" : isRegister ? "Create account" : "Log in"}
            {!loading && <Icon name="arrowRight" size={16} />}
          </button>

          <p className="auth-switch">
            {isRegister ? "Already have an account? " : "New to Splitly? "}
            <button type="button" onClick={() => switchMode(!isRegister)}>
              {isRegister ? "Log in instead" : "Create an account"}
            </button>
          </p>

          <p className="auth-fine">
            <Icon name="shield" size={13} /> Passwords are hashed — we never store them in plain text.
          </p>
        </form>
      </main>
    </div>
  );
}

export default Login;
