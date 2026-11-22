import React, { useState, useEffect } from "react";
import axios from "axios";
import { API, Icon, Modal, sameName } from "../ui";

function CreateGroupModal({ isOpen, onClose, user, onGroupCreated }) {
  const [name, setName] = useState("");
  const [others, setOthers] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setOthers([]);
      setDraft("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addDraft = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setOthers((cur) => {
      const next = [...cur];
      parts.forEach((p) => {
        if (!sameName(p, user.name) && !next.some((x) => sameName(x, p))) next.push(p);
      });
      return next;
    });
    setDraft("");
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    // include anything still typed in the member box
    const pending = draft
      .split(",")
      .map((s) => s.trim())
      .filter((p) => p && !sameName(p, user.name) && !others.some((x) => sameName(x, p)));
    const finalMembers = [user.name, ...others, ...pending];

    if (!name.trim()) return setError("Give the group a name.");
    if (finalMembers.length < 2) return setError("Add at least one other person.");

    setSaving(true);
    try {
      await axios.post(`${API}/api/groups/create`, {
        name: name.trim(),
        members: finalMembers,
        createdBy: user.name,
      });
      onGroupCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't create the group. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New group"
      subtitle="Who are you splitting with?"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating…" : "Create group"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="g-name">Group name</label>
          <input
            id="g-name"
            className="input"
            type="text"
            placeholder="Goa trip, Flat 4B, Friday lunch…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="g-member">Members</label>
          <div className="assist-row">
            <input
              id="g-member"
              className="input"
              type="text"
              placeholder="Type a name, press Enter"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addDraft();
                } else if (e.key === "Backspace" && !draft && others.length) {
                  setOthers(others.slice(0, -1));
                }
              }}
            />
            <button type="button" className="btn btn-ghost" onClick={addDraft} disabled={!draft.trim()}>
              Add
            </button>
          </div>
          <div className="chips" style={{ marginTop: 10 }}>
            <span className="chip is-static">You</span>
            {others.map((m) => (
              <span className="chip is-static" key={m}>
                {m}
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => setOthers(others.filter((x) => x !== m))}
                  aria-label={`Remove ${m}`}
                >
                  <Icon name="x" size={13} />
                </button>
              </span>
            ))}
          </div>
          <p className="hint">Use the same names when logging expenses. They don't need an account.</p>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default CreateGroupModal;
