import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API, CATEGORIES, Icon, Modal, inr, round2, sameName, toInputDate, expenseDate } from "../ui";
import { useToast } from "./Toasts";

const MODES = [
  { id: "equal", label: "Equally" },
  { id: "exact", label: "Exact amounts" },
  { id: "percent", label: "Percentages" },
];

function AddExpenseModal({ isOpen, onClose, user, groupId, members, onExpenseAdded, expense }) {
  const toast = useToast();
  const editing = Boolean(expense);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [paidBy, setPaidBy] = useState("");
  const [date, setDate] = useState(toInputDate());
  const [mode, setMode] = useState("equal");
  const [splitBetween, setSplitBetween] = useState([]);
  const [exact, setExact] = useState({});
  const [percent, setPercent] = useState({});

  const [scanning, setScanning] = useState(false);
  const [scanItems, setScanItems] = useState([]);
  const [nlText, setNlText] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [autoCat, setAutoCat] = useState(false);
  const [error, setError] = useState("");
  const [assistMsg, setAssistMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const categoryTouchedRef = useRef(false);
  const titleDebounceRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setScanItems([]);
    setNlText("");
    setError("");
    setAssistMsg("");
    setExact({});
    setPercent({});

    if (expense) {
      categoryTouchedRef.current = true;
      setTitle(expense.title);
      setAmount(String(expense.amount));
      setCategory(expense.category || "General");
      setPaidBy(members.find((m) => sameName(m, expense.paidBy)) || expense.paidBy);
      setDate(toInputDate(expenseDate(expense)));
      const shares = expense.splitAmong || [];
      const equal = shares.every((s) => Math.abs(s.amount - shares[0].amount) < 0.011);
      const canon = (n) => members.find((m) => sameName(m, n)) || n;
      if (equal) {
        setMode("equal");
        setSplitBetween(shares.map((s) => canon(s.name)));
      } else {
        setMode("exact");
        setSplitBetween(members);
        const ex = {};
        shares.forEach((s) => (ex[canon(s.name)] = String(round2(s.amount))));
        setExact(ex);
      }
    } else {
      categoryTouchedRef.current = false;
      setTitle("");
      setAmount("");
      setCategory("Food");
      setPaidBy(members.find((m) => sameName(m, user?.name)) || members[0] || "");
      setDate(toInputDate());
      setMode("equal");
      setSplitBetween(members || []);
    }
  }, [isOpen, members, user, expense]);

  // Debounced auto-categorize as the title is typed
  useEffect(() => {
    if (!isOpen || categoryTouchedRef.current) return;
    if (!title || title.trim().length < 3) return;

    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(async () => {
      try {
        setAutoCat(true);
        const { data } = await axios.post(`${API}/api/ai/categorize`, { title });
        if (data?.category && !categoryTouchedRef.current) setCategory(data.category);
      } catch {
        // best-effort
      } finally {
        setAutoCat(false);
      }
    }, 700);

    return () => titleDebounceRef.current && clearTimeout(titleDebounceRef.current);
  }, [title, isOpen]);

  const handleNlParse = async () => {
    if (!nlText.trim()) return;
    setNlParsing(true);
    setAssistMsg("");
    try {
      const { data } = await axios.post(`${API}/api/ai/parse-expense`, {
        text: nlText,
        members,
        currentUser: user?.name || "",
      });
      if (data.title) setTitle(data.title);
      if (data.amount) setAmount(String(data.amount));
      if (data.category) {
        setCategory(data.category);
        categoryTouchedRef.current = true;
      }
      if (data.paidBy) setPaidBy(data.paidBy);
      if (Array.isArray(data.splitBetween) && data.splitBetween.length > 0) {
        setMode("equal");
        setSplitBetween(data.splitBetween);
      }
      setAssistMsg("Filled in below — check it before saving.");
    } catch (err) {
      setAssistMsg(err.response?.data?.msg || "Couldn't read that. Try rephrasing.");
    } finally {
      setNlParsing(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAssistMsg("That isn't an image. Pick a photo of the receipt.");
      return;
    }

    setScanning(true);
    setScanItems([]);
    setAssistMsg("");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data } = await axios.post(`${API}/api/ocr/receipt`, { image: base64, mimeType: file.type });
      if (data.title) setTitle(data.title);
      if (data.amount) setAmount(String(data.amount));
      if (data.category) {
        setCategory(data.category);
        categoryTouchedRef.current = true;
      }
      if (Array.isArray(data.items)) setScanItems(data.items);
      setAssistMsg(data.amount ? "Receipt read — check the total before saving." : "Couldn't find a total. Enter it manually.");
    } catch (err) {
      setAssistMsg(err.response?.data?.msg || "Receipt scan failed.");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  const amt = Number(amount) || 0;
  const label = (m) => (sameName(m, user?.name) ? "You" : m);
  const toggleMember = (m) =>
    setSplitBetween((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  // ----- split maths -----
  const exactSum = round2(members.reduce((s, m) => s + (Number(exact[m]) || 0), 0));
  const exactLeft = round2(amt - exactSum);
  const pctSum = round2(members.reduce((s, m) => s + (Number(percent[m]) || 0), 0));
  const pctLeft = round2(100 - pctSum);

  const buildSplits = () => {
    if (mode === "exact") {
      return members
        .map((m) => ({ name: m, amount: round2(Number(exact[m]) || 0) }))
        .filter((s) => s.amount > 0);
    }
    if (mode === "percent") {
      const rows = members
        .map((m) => ({ name: m, pct: Number(percent[m]) || 0 }))
        .filter((r) => r.pct > 0)
        .map((r) => ({ name: r.name, amount: round2((amt * r.pct) / 100) }));
      // put any rounding remainder on the last share so the total is exact
      const diff = round2(amt - rows.reduce((s, r) => s + r.amount, 0));
      if (rows.length && diff !== 0) rows[rows.length - 1].amount = round2(rows[rows.length - 1].amount + diff);
      return rows;
    }
    return null;
  };

  const splitEvenly = () => {
    const each = members.length ? Math.floor((amt / members.length) * 100) / 100 : 0;
    const next = {};
    members.forEach((m, i) => {
      next[m] = String(i === members.length - 1 ? round2(amt - each * (members.length - 1)) : each);
    });
    setExact(next);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!title.trim()) return setError("Add a short description.");
    if (!(amt > 0)) return setError("Enter an amount greater than zero.");
    if (mode === "equal" && splitBetween.length === 0) return setError("Pick at least one person to split with.");
    if (mode === "exact" && Math.abs(exactLeft) > 0.01)
      return setError(exactLeft > 0 ? `${inr(exactLeft)} still needs to be assigned.` : `Shares are ${inr(exactLeft)} over the total.`);
    if (mode === "percent" && Math.abs(pctLeft) > 0.01)
      return setError(pctLeft > 0 ? `${pctLeft}% still needs to be assigned.` : `Percentages add up to ${pctSum}%.`);

    const payload = {
      title: title.trim(),
      amount: amt,
      category,
      paidBy,
      members,
      groupId,
      date,
    };
    const splits = buildSplits();
    if (splits) payload.splits = splits;
    else payload.splitBetween = splitBetween;

    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/api/expenses/${expense._id}`, payload);
        toast({ message: `Updated “${payload.title}”` });
      } else {
        await axios.post(`${API}/api/expenses/add`, payload);
        toast({ message: `Added “${payload.title}” · ${inr(amt)}` });
      }
      onExpenseAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't save the expense. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const each = splitBetween.length ? amt / splitBetween.length : 0;

  return (
    <Modal
      title={editing ? "Edit expense" : "Add expense"}
      subtitle={groupId}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add expense"}
          </button>
        </>
      }
    >
      {!editing && (
        <div className="assist">
          <div className="assist-head">
            <span className="label">
              <Icon name="bolt" size={15} /> Quick entry
            </span>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleReceiptUpload} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={scanning}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="camera" size={15} />
              {scanning ? "Reading…" : "Scan receipt"}
            </button>
          </div>
          <div className="assist-row">
            <input
              className="input"
              type="text"
              placeholder="I paid 600 for pizza for me, Raj and Anu"
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleNlParse();
                }
              }}
              aria-label="Describe the expense in one sentence"
            />
            <button
              type="button"
              className="btn btn-ghost"
              disabled={nlParsing || !nlText.trim()}
              onClick={handleNlParse}
            >
              {nlParsing ? "Reading…" : "Fill"}
            </button>
          </div>
          {assistMsg && <p className="hint" style={{ marginTop: 8 }}>{assistMsg}</p>}
          {scanItems.length > 0 && (
            <ul className="scan-items">
              {scanItems.map((it, i) => (
                <li key={i}>
                  <span>{it.name}</span>
                  <span className="num">{inr(it.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="exp-title">Description</label>
          <input
            id="exp-title"
            className="input"
            type="text"
            placeholder="Pizza dinner"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus={!editing}
          />
        </div>

        <div className="field-row" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="exp-amount">Amount</label>
            <div className="input-prefix">
              <span>₹</span>
              <input
                id="exp-amount"
                className="input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="exp-date">Date</label>
            <input
              id="exp-date"
              className="input"
              type="date"
              value={date}
              max={toInputDate()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field-row" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="exp-cat">
              Category {autoCat && <span className="hint">suggesting…</span>}
            </label>
            <select
              id="exp-cat"
              className="select"
              value={category}
              onChange={(e) => {
                categoryTouchedRef.current = true;
                setCategory(e.target.value);
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="exp-paid">Paid by</label>
            <select id="exp-paid" className="select" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m} value={m}>
                  {label(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <div className="split-head">
            <span className="label">Split</span>
            <div className="segmented" role="tablist" aria-label="Split method">
              {MODES.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  role="tab"
                  aria-selected={mode === m.id}
                  className={mode === m.id ? "on" : ""}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "equal" && (
            <>
              <div className="chips">
                {members.map((m) => {
                  const on = splitBetween.includes(m);
                  return (
                    <button type="button" key={m} className="chip" aria-pressed={on} onClick={() => toggleMember(m)}>
                      <span className="tick">
                        <Icon name="check" size={10} />
                      </span>
                      {label(m)}
                    </button>
                  );
                })}
              </div>
              <p className="split-summary">
                {splitBetween.length === 0
                  ? "Nobody selected."
                  : amt > 0
                  ? `${inr(each)} each · ${splitBetween.length} ${splitBetween.length === 1 ? "person" : "people"}`
                  : `Split equally between ${splitBetween.length}.`}
              </p>
            </>
          )}

          {mode !== "equal" && (
            <>
              <div className="share-grid">
                {members.map((m) => (
                  <label className="share-row" key={m}>
                    <span>{label(m)}</span>
                    <div className="input-prefix">
                      <span>{mode === "exact" ? "₹" : "%"}</span>
                      <input
                        className="input"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={(mode === "exact" ? exact : percent)[m] || ""}
                        onChange={(e) =>
                          (mode === "exact" ? setExact : setPercent)((cur) => ({ ...cur, [m]: e.target.value }))
                        }
                      />
                    </div>
                    {mode === "percent" && (
                      <span className="share-calc num">{inr(((Number(percent[m]) || 0) * amt) / 100)}</span>
                    )}
                  </label>
                ))}
              </div>
              <div className="split-summary split-status">
                {mode === "exact" ? (
                  <>
                    <span className={Math.abs(exactLeft) < 0.01 ? "pos" : exactLeft < 0 ? "neg" : ""}>
                      {Math.abs(exactLeft) < 0.01
                        ? "All assigned"
                        : exactLeft > 0
                        ? `${inr(exactLeft)} left to assign`
                        : `${inr(exactLeft)} over`}
                    </span>
                    <button type="button" className="btn btn-text btn-sm" onClick={splitEvenly} disabled={!amt}>
                      Fill evenly
                    </button>
                  </>
                ) : (
                  <span className={Math.abs(pctLeft) < 0.01 ? "pos" : pctLeft < 0 ? "neg" : ""}>
                    {Math.abs(pctLeft) < 0.01 ? "100% assigned" : pctLeft > 0 ? `${pctLeft}% left` : `${-pctLeft}% over`}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default AddExpenseModal;
