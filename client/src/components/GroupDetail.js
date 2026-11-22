import { useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  API,
  CATEGORIES,
  Icon,
  Monogram,
  AvatarStack,
  inr,
  round2,
  sameName,
  displayName,
  relativeDay,
  isSettlement,
  expenseDate,
  toInputDate,
  downloadFile,
  csvCell,
  useOutsideClose,
  hueFor,
} from "../ui";
import { useToast } from "./Toasts";
import { CategoryBreakdown, DailySpend, PaidBy } from "./Charts";

/* ---------- helpers shared with App (CSV export, text summary) ---------- */
export function buildCsv(groupId, expenses, members) {
  const head = ["Date", "Description", "Category", "Paid by", "Amount", ...members.map((m) => `${m}'s share`)];
  const rows = [...expenses]
    .sort((a, b) => new Date(expenseDate(a)) - new Date(expenseDate(b)))
    .map((e) => {
      const shares = members.map((m) => {
        const s = e.splitAmong.find((x) => sameName(x.name, m));
        return s ? round2(s.amount) : 0;
      });
      return [
        toInputDate(expenseDate(e)),
        isSettlement(e) ? `Payment to ${e.splitAmong[0]?.name}` : e.title,
        isSettlement(e) ? "Settlement" : e.category,
        e.paidBy,
        round2(e.amount),
        ...shares,
      ];
    });
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

export function exportGroupCsv(groupId, expenses, members) {
  const safe = groupId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  downloadFile(`splitly-${safe}-${toInputDate()}.csv`, buildCsv(groupId, expenses, members));
}

function summaryText(groupId, total, settlements, canonical) {
  const lines = [`${groupId} — ${inr(total)} spent`];
  if (settlements.length === 0) lines.push("Everyone is settled up ✅");
  else {
    lines.push("", "To settle up:");
    settlements.forEach((s) => lines.push(`• ${canonical(s.from)} pays ${canonical(s.to)} ${inr(s.amount)}`));
  }
  lines.push("", "— via Splitly");
  return lines.join("\n");
}

function GroupDetail({
  user,
  groupId,
  group,
  expenses,
  settlements,
  loading,
  onBack,
  onAddExpense,
  onEditExpense,
  onAsk,
  onSettings,
  onChanged,
}) {
  const toast = useToast();
  const [tab, setTab] = useState("expenses");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useOutsideClose(menuRef, menuOpen, () => setMenuOpen(false));

  const members = useMemo(() => group?.members || [], [group]);
  const name = (n) => displayName(n, user, members);
  const canonical = (n) => members.find((m) => sameName(m, n)) || n;

  // ----- balances (case-insensitive) -----
  const balanceRows = useMemo(() => {
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
    return Object.entries(balances)
      .map(([k, v]) => ({ key: k, value: round2(v) }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, members]);
  const maxAbs = Math.max(1, ...balanceRows.map((r) => Math.abs(r.value)));

  // ----- expense list -----
  const all = useMemo(
    () =>
      expenses
        .filter((e) => !isSettlement(e) || (e.splitAmong[0] && !sameName(e.paidBy, e.splitAmong[0].name)))
        .sort((a, b) => new Date(expenseDate(b)) - new Date(expenseDate(a)) || new Date(b.createdAt) - new Date(a.createdAt)),
    [expenses]
  );
  const term = query.trim().toLowerCase();
  const visible = all.filter((e) => {
    if (cat === "Settlements") return isSettlement(e);
    if (cat !== "All" && (isSettlement(e) || e.category !== cat)) return false;
    if (!term) return true;
    return (
      e.title.toLowerCase().includes(term) ||
      e.paidBy.toLowerCase().includes(term) ||
      (e.category || "").toLowerCase().includes(term)
    );
  });
  const spend = all.filter((e) => !isSettlement(e));
  const total = group?.totalAmount || 0;
  const filteredTotal = visible.filter((e) => !isSettlement(e)).reduce((s, e) => s + e.amount, 0);

  // ----- insights numbers -----
  const insights = useMemo(() => {
    const biggest = spend.reduce((b, e) => (!b || e.amount > b.amount ? e : b), null);
    const dates = spend.map((e) => new Date(expenseDate(e)).getTime());
    const spanDays = dates.length ? Math.max(1, Math.round((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1) : 0;
    const mine = spend.reduce((s, e) => {
      const sh = e.splitAmong.find((x) => sameName(x.name, user?.name));
      return s + (sh ? sh.amount : 0);
    }, 0);
    return { biggest, perDay: spanDays ? total / spanDays : 0, spanDays, mine };
  }, [spend, total, user]);

  // ----- actions -----
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
      toast({ message: `Recorded ${name(s.from)} → ${name(s.to)} · ${inr(s.amount)}` });
      await onChanged();
    } catch (err) {
      toast({ message: "Couldn't record that payment", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const remind = (s) => {
    const from = canonical(s.from);
    const to = sameName(s.to, user?.name) ? "me" : canonical(s.to);
    const text = `Hey ${from}! Quick reminder from Splitly: you owe ${to} ${inr(s.amount)} for ${groupId}. 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const deleteExpense = async (e) => {
    try {
      await axios.delete(`${API}/api/expenses/${e._id}`);
      await onChanged();
      toast({
        message: `Deleted “${isSettlement(e) ? "Payment" : e.title}”`,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await axios.post(`${API}/api/expenses/add`, {
                groupId,
                title: e.title,
                amount: e.amount,
                category: e.category,
                paidBy: e.paidBy,
                members: e.members,
                date: expenseDate(e),
                splits: e.splitAmong.map((s) => ({ name: s.name, amount: s.amount })),
              });
              await onChanged();
            } catch {
              toast({ message: "Couldn't restore it", tone: "error" });
            }
          },
        },
      });
    } catch {
      toast({ message: "Couldn't delete that expense", tone: "error" });
    }
  };

  const copySummary = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(summaryText(groupId, total, settlements, (n) => canonical(n)));
      toast({ message: "Summary copied — paste it in your group chat" });
    } catch {
      toast({ message: "Couldn't access the clipboard", tone: "error" });
    }
  };

  const shareLine = (e) => {
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

  const isCustom = (e) =>
    e.splitAmong.length > 1 && e.splitAmong.some((s) => Math.abs(s.amount - e.splitAmong[0].amount) > 0.011);

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <button onClick={onBack}>Overview</button>
        <Icon name="chevron" size={13} />
        <span className="current">{groupId}</span>
      </nav>

      <div className="page-head group-banner rise" style={{ "--h": hueFor(groupId), "--i": 0 }}>
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
          <div className="menu-wrap" ref={menuRef}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More actions"
              aria-expanded={menuOpen}
            >
              <Icon name="more" size={16} />
            </button>
            {menuOpen && (
              <div className="menu" role="menu">
                <button role="menuitem" onClick={copySummary}>
                  <Icon name="copy" size={15} /> Copy summary
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    exportGroupCsv(groupId, expenses, members);
                    toast({ message: "CSV downloaded" });
                  }}
                  disabled={expenses.length === 0}
                >
                  <Icon name="download" size={15} /> Export CSV
                </button>
                <div className="menu-sep" />
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSettings();
                  }}
                >
                  <Icon name="settings" size={15} /> Group settings
                </button>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={onAddExpense}>
            <Icon name="plus" size={16} /> Add expense
          </button>
        </div>
      </div>

      <div className="tabs rise" role="tablist" style={{ "--i": 1 }}>
        <button role="tab" aria-selected={tab === "expenses"} className={tab === "expenses" ? "on" : ""} onClick={() => setTab("expenses")}>
          <Icon name="list" size={15} /> Expenses <span className="tab-count">{spend.length}</span>
        </button>
        <button role="tab" aria-selected={tab === "insights"} className={tab === "insights" ? "on" : ""} onClick={() => setTab("insights")}>
          <Icon name="chart" size={15} /> Insights
        </button>
      </div>

      {tab === "insights" ? (
        <div className="insights rise" style={{ "--i": 2 }}>
          <div className="stats">
            <div className="stat">
              <div className="stat-top">Total spent</div>
              <div className="stat-value">{inr(total)}</div>
              <div className="stat-sub">{spend.length} expenses</div>
            </div>
            <div className="stat">
              <div className="stat-top">Your share</div>
              <div className="stat-value">{inr(insights.mine)}</div>
              <div className="stat-sub">{total ? `${Math.round((insights.mine / total) * 100)}% of the total` : "—"}</div>
            </div>
            <div className="stat">
              <div className="stat-top">Per day</div>
              <div className="stat-value">{inr(Math.round(insights.perDay))}</div>
              <div className="stat-sub">
                {insights.spanDays ? `Over ${insights.spanDays} ${insights.spanDays === 1 ? "day" : "days"}` : "—"}
              </div>
            </div>
            <div className="stat">
              <div className="stat-top">Biggest expense</div>
              <div className="stat-value">{insights.biggest ? inr(insights.biggest.amount) : "—"}</div>
              <div className="stat-sub ellipsis">{insights.biggest ? insights.biggest.title : "Nothing yet"}</div>
            </div>
          </div>

          <div className="insight-grid">
            <section className="card">
              <div className="card-head">
                <div>
                  <h3>Spending by category</h3>
                  <p>Where the group's money went</p>
                </div>
              </div>
              <div className="card-body">
                <CategoryBreakdown expenses={expenses} />
              </div>
            </section>
            <section className="card">
              <div className="card-head">
                <div>
                  <h3>Who paid</h3>
                  <p>Total each person has paid for</p>
                </div>
              </div>
              <div className="card-body">
                <PaidBy expenses={expenses} members={members} user={user} />
              </div>
            </section>
          </div>
          <section className="card" style={{ marginTop: 16 }}>
            <div className="card-head">
              <div>
                <h3>Daily spending</h3>
                <p>Last 30 days, by expense date</p>
              </div>
            </div>
            <div className="card-body">
              <DailySpend expenses={expenses} />
            </div>
          </section>
        </div>
      ) : (
        <div className="detail-grid rise" style={{ "--i": 2 }}>
          <section className="card" aria-label="Expenses">
            <div className="toolbar">
              <div className="search">
                <Icon name="search" size={15} />
                <input
                  placeholder="Search expenses"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search expenses"
                />
                {query && (
                  <button className="icon-btn" onClick={() => setQuery("")} aria-label="Clear search">
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>
              <select className="select select-sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
                <option value="All">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Settlements">Payments only</option>
              </select>
            </div>

            {loading && all.length === 0 ? (
              <div className="skeleton-list" aria-label="Loading">
                {[0, 1, 2, 3].map((i) => (
                  <div className="skeleton-row" key={i}>
                    <span className="sk sk-icon" />
                    <span className="sk sk-line" />
                    <span className="sk sk-amt" />
                  </div>
                ))}
              </div>
            ) : all.length === 0 ? (
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
            ) : visible.length === 0 ? (
              <div className="empty">
                <h3>No matches</h3>
                <p>Nothing matches “{query || cat}”.</p>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setQuery("");
                    setCat("All");
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="hide-sm">Paid by</th>
                      <th className="hide-sm">Date</th>
                      <th className="right">Amount</th>
                      <th className="shrink" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((e) => {
                      const settle = isSettlement(e);
                      return (
                        <tr key={e._id} className="has-actions">
                          <td>
                            <div className="cell-main">
                              <span
                                className={`cat-icon${settle ? " settled" : ""}`}
                                title={settle ? "Payment" : e.category}
                              >
                                <Icon name={settle ? "check" : e.category} size={16} />
                              </span>
                              <div>
                                <strong>{settle ? "Payment" : e.title}</strong>
                                <small>
                                  {settle
                                    ? `${name(e.paidBy)} → ${name(e.splitAmong[0]?.name)}`
                                    : `${e.category} · ${isCustom(e) ? "custom split" : `split ${e.splitAmong.length} ${e.splitAmong.length === 1 ? "way" : "ways"}`}`}
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
                          <td className="hide-sm muted nowrap">{relativeDay(expenseDate(e))}</td>
                          <td className="right">
                            <span className={`amount block${settle ? " pos" : ""}`}>{inr(e.amount)}</span>
                            {settle ? <span className="share muted">Settlement</span> : shareLine(e)}
                          </td>
                          <td className="shrink">
                            <div className="row-actions">
                              {!settle && (
                                <button className="icon-btn" onClick={() => onEditExpense(e)} aria-label={`Edit ${e.title}`} title="Edit">
                                  <Icon name="edit" size={15} />
                                </button>
                              )}
                              <button
                                className="icon-btn danger"
                                onClick={() => deleteExpense(e)}
                                aria-label={`Delete ${settle ? "payment" : e.title}`}
                                title="Delete"
                              >
                                <Icon name="trash" size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {(term || cat !== "All") && (
                  <div className="table-foot">
                    Showing {visible.length} of {all.length} · <span className="num">{inr(filteredTotal)}</span>
                  </div>
                )}
              </>
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
                  const iOwe = sameName(s.from, user?.name);
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
                        {isConfirming ? (
                          <button className="btn btn-text btn-sm" onClick={() => setConfirming(null)}>
                            Cancel
                          </button>
                        ) : (
                          !iOwe && (
                            <button
                              className="icon-btn"
                              onClick={() => remind(s)}
                              title={`Remind ${canonical(s.from)} on WhatsApp`}
                              aria-label={`Remind ${canonical(s.from)} on WhatsApp`}
                            >
                              <Icon name="whatsapp" size={16} />
                            </button>
                          )
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
      )}
    </>
  );
}

export default GroupDetail;
