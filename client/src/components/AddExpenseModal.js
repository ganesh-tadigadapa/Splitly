import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API, CATEGORIES, Icon, Modal, inr, sameName } from "../ui";

function AddExpenseModal({ isOpen, onClose, user, groupId, members, onExpenseAdded }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [paidBy, setPaidBy] = useState("");
  const [splitBetween, setSplitBetween] = useState([]);

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
    if (isOpen) {
      setTitle("");
      setAmount("");
      setCategory("Food");
      setPaidBy(members.find((m) => sameName(m, user?.name)) || members[0] || "");
      setScanItems([]);
      setNlText("");
      setError("");
      setAssistMsg("");
      categoryTouchedRef.current = false;
      setSplitBetween(members || []);
    }
  }, [isOpen, members, user]);

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
      if (Array.isArray(data.splitBetween) && data.splitBetween.length > 0) setSplitBetween(data.splitBetween);
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

  const toggleMember = (m) =>
    setSplitBetween((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const amt = Number(amount) || 0;
  const each = splitBetween.length ? amt / splitBetween.length : 0;
  const label = (m) => (sameName(m, user?.name) ? "You" : m);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!title.trim()) return setError("Add a short description.");
    if (!(amt > 0)) return setError("Enter an amount greater than zero.");
    if (splitBetween.length === 0) return setError("Pick at least one person to split with.");

    setSaving(true);
    try {
      await axios.post(`${API}/api/expenses/add`, {
        title: title.trim(),
        amount: amt,
        category,
        paidBy,
        members,
        splitBetween,
        groupId,
      });
      onExpenseAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't save the expense. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add expense"
      subtitle={groupId}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Add expense"}
          </button>
        </>
      }
    >
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
            autoFocus
          />
        </div>

        <div className="field-row" style={{ marginTop: 18 }}>
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
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <label htmlFor="exp-paid">Paid by</label>
          <select id="exp-paid" className="select" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {members.map((m) => (
              <option key={m} value={m}>
                {label(m)}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <span className="label">Split between</span>
          <div className="chips">
            {members.map((m) => {
              const on = splitBetween.includes(m);
              return (
                <button
                  type="button"
                  key={m}
                  className="chip"
                  aria-pressed={on}
                  onClick={() => toggleMember(m)}
                >
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
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default AddExpenseModal;
