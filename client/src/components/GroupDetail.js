import { useState } from "react";
import axios from "axios";
import { API, Icon, Monogram, AvatarStack, inr, round2, sameName, displayName, shortDate } from "../ui";

const isSettlement = (e) => e.title === "Settlement Payment";

function GroupDetail({ user, groupId, group, expenses, settlements, onBack, onAddExpense, onAsk, onChanged }) {
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(null);

  const members = group?.members || [];
  const name = (n) => displayName(n, user, members);
  const canonical = (n) => members.find((m) => sameName(m, n)) || n;

  // ----- balances (case-insensitive) -----
  const balances = {};
  members.forEach((m) => (balances[m.toLowerCase()] = 0));
  expenses.forEach((e) => {
    const p = e.paidBy.toLowerCase();
    balances[p] = (balances[p] || 0) + e.amount;
    e.splitAmong.forEach((s) => {
      const k = s.name.toLowerCase();
      balances[k] = (balances[k] || 0) - s.amount;
    });
  });
  const balanceRows = Object.entries(balances)
    .map(([k, v]) => ({ key: k, value: round2(v) }))
    .sort((a, b) => b.value - a.value);
  const maxAbs = Math.max(1, ...balanceRows.map((r) => Math.abs(r.value)));

  // ----- expense list -----
  const visible = expenses
    .filter((e) => !isSettlement(e) || (e.splitAmong[0] && !sameName(e.paidBy, e.splitAmong[0].name)))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const spendCount = visible.filter((e) => !isSettlement(e)).length;
  const total = group?.totalAmount || 0;

  const markPaid = async (s) => {
    const key = `${s.from}-${s.to}`;
    if (confirming !== key) {
      setConfirming(key);
      return;
    }
    setBusy(key);
    try {
      await axios.post(`${API}/api/expenses/add`, {
        groupId,
        title: "Settlement Payment",
        amount: s.amount,
        category: "General",
        paidBy: canonical(s.from),
        members,
        splitBetween: [canonical(s.to)],
      });
      setConfirming(null);
      await onChanged();
    } catch (err) {
      console.error("Error marking as settled", err);
    } finally {
      setBusy(null);
    }
  };

  const share = (e) => {
    const mine = e.splitAmong.find((s) => sameName(s.name, user?.name));
    const myShare = mine ? mine.amount : 0;
    if (sameName(e.paidBy, user?.name)) {
      const lent = round2(e.amount - myShare);
      return lent > 0 ? <span className="share pos">You lent {inr(lent)}</span> : <span className="share muted">—</span>;
    }
    return myShare > 0 ? (
      <span className="share neg">You owe {inr(myShare)}</span>
    ) : (
      <span className="share muted">Not involved</span>
    );
  };

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <button onClick={onBack}>Overview</button>
        <Icon name="chevron" size={13} />
        <span className="current">{groupId}</span>
      </nav>

      <div className="page-head">
        <div className="group-title">
          <Monogram name={groupId} size="lg" />
          <div style={{ minWidth: 0 }}>
            <h1>{groupId}</h1>
            <div className="group-meta">
              <AvatarStack names={members} max={5} />
              <span>{members.length} members</span>
              <span className="dot" />
              <span className="num">{inr(total)} spent</span>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={onAsk}>
            <Icon name="message" size={15} /> Ask AI
          </button>
          <button className="btn btn-primary" onClick={onAddExpense}>
            <Icon name="plus" size={16} /> Add expense
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <section className="card" aria-label="Expenses">
          <div className="card-head">
            <div>
              <h2>Expenses</h2>
              <p>
                {spendCount} {spendCount === 1 ? "expense" : "expenses"}
              </p>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">
                <Icon name="General" size={20} />
              </span>
              <h3>No expenses yet</h3>
              <p>Add the first one manually, describe it in a sentence, or scan a receipt.</p>
              <button className="btn btn-primary" onClick={onAddExpense}>
                <Icon name="plus" size={16} /> Add expense
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="hide-sm">Paid by</th>
                  <th className="hide-sm">Date</th>
                  <th className="right">Amount</th>
                  <th className="right hide-sm">Your share</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) =>
                  isSettlement(e) ? (
                    <tr key={e._id}>
                      <td>
                        <div className="cell-main">
                          <span className="cat-icon settled">
                            <Icon name="check" size={16} />
                          </span>
                          <div>
                            <strong>Payment</strong>
                            <small>
                              {name(e.paidBy)} → {name(e.splitAmong[0]?.name)}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="hide-sm">
                        <span className="cell-person">
                          <Monogram name={canonical(e.paidBy)} size="xs" round />
                          {name(e.paidBy)}
                        </span>
                      </td>
                      <td className="hide-sm muted">{shortDate(e.createdAt)}</td>
                      <td className="right amount pos">{inr(e.amount)}</td>
                      <td className="right hide-sm">
                        <span className="share muted">Settlement</span>
                      </td>
                    </tr>
                  ) : (
                    <tr key={e._id}>
                      <td>
                        <div className="cell-main">
                          <span className="cat-icon" title={e.category}>
                            <Icon name={e.category} size={16} />
                          </span>
                          <div>
                            <strong>{e.title}</strong>
                            <small>
                              {e.category} · split {e.splitAmong.length} {e.splitAmong.length === 1 ? "way" : "ways"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="hide-sm">
                        <span className="cell-person">
                          <Monogram name={canonical(e.paidBy)} size="xs" round />
                          {name(e.paidBy)}
                        </span>
                      </td>
                      <td className="hide-sm muted">{shortDate(e.createdAt)}</td>
                      <td className="right amount">{inr(e.amount)}</td>
                      <td className="right hide-sm">{share(e)}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </section>

        <aside>
          <section className="card" aria-label="Settle up">
            <div className="card-head">
              <div>
                <h3>Settle up</h3>
                <p>Fewest transfers to clear all debts</p>
              </div>
            </div>
            {settlements.length === 0 ? (
              <div className="all-clear">
                <Icon name="check" size={16} /> Everyone is settled up.
              </div>
            ) : (
              settlements.map((s) => {
                const key = `${s.from}-${s.to}`;
                const isConfirming = confirming === key;
                return (
                  <div className="settle-row" key={key}>
                    <div className="settle-who">
                      <AvatarStack names={[canonical(s.from), canonical(s.to)]} />
                      <div className="names">
                        {name(s.from)} → {name(s.to)}
                        <strong>{inr(s.amount)}</strong>
                      </div>
                    </div>
                    <div className="settle-actions">
                      {isConfirming && (
                        <button className="btn btn-text btn-sm" onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                      )}
                      <button
                        className={`btn btn-sm ${isConfirming ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => markPaid(s)}
                        disabled={busy === key}
                      >
                        {busy === key ? "Saving…" : isConfirming ? "Confirm" : "Mark paid"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <section className="card" aria-label="Balances">
            <div className="card-head">
              <div>
                <h3>Balances</h3>
                <p>Paid minus share, per person</p>
              </div>
            </div>
            <div className="card-body">
              {balanceRows.map((r) => {
                const pct = (Math.abs(r.value) / maxAbs) * 50;
                const cls = r.value > 0 ? "pos" : r.value < 0 ? "neg" : "";
                return (
                  <div className="bal-row" key={r.key}>
                    <span className="bal-name">
                      <Monogram name={canonical(r.key)} size="xs" round />
                      <span>{name(r.key)}</span>
                    </span>
                    <span className="bal-track" aria-hidden="true">
                      {cls && <span className={`bal-fill ${cls}`} style={{ width: `${pct}%` }} />}
                    </span>
                    <span className={`bal-amt ${cls}`}>
                      {r.value > 0 ? "+" : r.value < 0 ? "−" : ""}
                      {inr(r.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

export default GroupDetail;
