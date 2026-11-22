import { useState } from "react";
import axios from "axios";
import { API, Icon, Modal, Monogram, sameName } from "../ui";
import { useToast } from "./Toasts";

function GroupSettingsModal({ group, user, onClose, onChanged, onDeleted }) {
  const toast = useToast();
  const [member, setMember] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const name = group.name;
  const url = `${API}/api/groups/${encodeURIComponent(name)}`;

  const addMember = async (e) => {
    e.preventDefault();
    const m = member.trim();
    if (!m) return;
    setError("");
    setAdding(true);
    try {
      await axios.post(`${url}/members`, { name: m });
      setMember("");
      toast({ message: `${m} added to ${name}` });
      await onChanged();
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't add that person.");
    } finally {
      setAdding(false);
    }
  };

  const deleteGroup = async () => {
    setDeleting(true);
    try {
      const { data } = await axios.delete(url);
      toast({ message: `Deleted ${name} and ${data.expensesDeleted} ${data.expensesDeleted === 1 ? "expense" : "expenses"}` });
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't delete the group.");
      setDeleting(false);
    }
  };

  return (
    <Modal title="Group settings" subtitle={name} onClose={onClose}>
      <div className="settings-section">
        <h4>Members</h4>
        <ul className="member-list">
          {group.members.map((m) => (
            <li key={m}>
              <Monogram name={m} size="sm" round />
              <span>{m}</span>
              {sameName(m, user.name) && <span className="badge">You</span>}
              {sameName(m, group.createdBy) && <span className="muted member-role">Created the group</span>}
            </li>
          ))}
        </ul>
        <form className="assist-row" onSubmit={addMember} style={{ marginTop: 12 }}>
          <input
            className="input"
            placeholder="Add someone by name"
            value={member}
            onChange={(e) => setMember(e.target.value)}
            aria-label="New member name"
          />
          <button className="btn btn-ghost" type="submit" disabled={adding || !member.trim()}>
            <Icon name="userPlus" size={15} /> {adding ? "Adding…" : "Add"}
          </button>
        </form>
        {error && <div className="form-error" role="alert">{error}</div>}
      </div>

      <div className="settings-section danger">
        <h4>Delete group</h4>
        <p className="hint">
          Permanently deletes <b>{name}</b> and every expense in it for all members. This can't be undone.
        </p>
        <div className="assist-row" style={{ marginTop: 10 }}>
          <input
            className="input"
            placeholder={`Type “${name}” to confirm`}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            aria-label="Type the group name to confirm deletion"
          />
          <button className="btn btn-danger" disabled={confirmName.trim() !== name || deleting} onClick={deleteGroup}>
            <Icon name="trash" size={15} /> {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default GroupSettingsModal;
