import { useState } from "react";
import axios from "axios";
import { API, Icon, Logo } from "../ui";

const FEATURES = [
  { icon: "camera", title: "Scan receipts", text: "Snap a bill — amount, items and category fill themselves." },
  { icon: "Settlement", title: "Settle in fewer transfers", text: "Debts are simplified so everyone pays the minimum." },
  { icon: "message", title: "Ask about your spending", text: "Get answers like \u201cwho owes the most?\u201d instantly." },
];

function Login({ setUser }) {
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        setInfo("Account created. Log in to continue.");
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

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
    setInfo("");
  };

  return (
    <div className="auth">
      <aside className="auth-aside">
        <Logo />

        <div className="auth-pitch">
          <h1>Shared expenses, without the spreadsheet.</h1>
          <p>Track what your group spends, see live balances, and settle up with the fewest possible payments.</p>
          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}>
                <span className="stat-icon">
                  <Icon name={f.icon} size={16} />
                </span>
                <div>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="auth-foot">© {new Date().getFullYear()} Splitly</p>
      </aside>

      <main className="auth-main">
        <form className="auth-form" onSubmit={handleAuth} noValidate={false}>
          <div className="auth-brand-mobile">
            <Logo />
          </div>

          <h2>{isRegister ? "Create an account" : "Log in to Splitly"}</h2>
          <p>{isRegister ? "Start splitting expenses in under a minute." : "Welcome back. Enter your details to continue."}</p>

          {isRegister && (
            <div className="field">
              <label htmlFor="name">Name</label>
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
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
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
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder={isRegister ? "At least 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 6 : undefined}
              required
            />
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}
          {info && <div className="form-note" role="status">{info}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "One moment…" : isRegister ? "Create account" : "Log in"}
          </button>

          <p className="auth-switch">
            {isRegister ? "Already have an account? " : "New to Splitly? "}
            <button type="button" onClick={toggleMode}>
              {isRegister ? "Log in" : "Create an account"}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

export default Login;
