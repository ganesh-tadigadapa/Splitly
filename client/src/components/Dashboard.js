import {
  Icon,
  Monogram,
  AvatarStack,
  inr,
  round2,
  sameName,
  relativeDay,
  isSettlement,
  expenseDate,
  dayKey,
  hueFor,
  CountUp,
  Sparkline,
  MOD,
} from "../ui";
import { CategoryBreakdown, DailySpend } from "./Charts";

function ActivityFeed({ expenses, user, onOpenGroup }) {
  const items = [...expenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);
  if (items.length === 0) return <p className="chart-empty">Nothing yet. New expenses and payments show up here.</p>;
  const who = (n) => (sameName(n, user.name) ? "You" : n);
  return (
    <ul className="feed">
      {items.map((e) => {
        const settle = isSettlement(e);
        return (
          <li key={e._id}>
            <button className="feed-item" onClick={() => onOpenGroup(e.groupId)}>
              <span className={`cat-icon${settle ? " settled" : ""}`}>
                <Icon name={settle ? "check" : e.category} size={15} />
              </span>
              <span className="feed-text">
                <span>
                  <b>{who(e.paidBy)}</b>{" "}
                  {settle ? (
                    <>
                      paid <b>{who(e.splitAmong[0]?.name)}</b>
                    </>
                  ) : (
                    <>
                      added <b>{e.title}</b>
                    </>
                  )}
                </span>
                <small>
                  {e.groupId} · {relativeDay(expenseDate(e))}
                </small>
              </span>
              <span className={`amount${settle ? " pos" : ""}`}>{inr(e.amount)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function BalanceBadge({ value }) {
  const n = round2(value); // positive = you owe
  if (n === 0) return <span className="badge">Settled</span>;
  return n > 0 ? (
    <span className="badge neg">You owe {inr(n)}</span>
  ) : (
    <span className="badge pos">Owed {inr(n)}</span>
  );
}

function Stat({ label, icon, tone, value, sub, i }) {
  return (
    <div className="stat rise" style={{ "--i": i }}>
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon tint-${tone}`}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="stat-value">
        <CountUp value={value} format={inr} />
      </div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function last30Days(expenses) {
  const byDay = {};
  expenses.forEach((e) => {
    if (isSettlement(e)) return;
    const k = dayKey(expenseDate(e));
    byDay[k] = (byDay[k] || 0) + e.amount;
  });
  const out = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(byDay[dayKey(d)] || 0);
  }
  return out;
}

function Dashboard({ user, groups, allExpenses = [], loaded, onOpenGroup, onNewGroup }) {
  // netOwe from the API: positive = you owe, negative = you're owed
  const youOwe = groups.reduce((s, g) => s + Math.max(0, g.netOwe || 0), 0);
  const owedToYou = groups.reduce((s, g) => s + Math.max(0, -(g.netOwe || 0)), 0);
  const net = round2(owedToYou - youOwe);
  const totalTracked = groups.reduce((s, g) => s + (g.totalAmount || 0), 0);
  const totalExpenses = groups.reduce((s, g) => s + (g.totalExpenses || 0), 0);
  const owingGroups = groups.filter((g) => round2(g.netOwe || 0) > 0).length;
  const owedGroups = groups.filter((g) => round2(g.netOwe || 0) < 0).length;
  const firstName = (user.name || "").split(" ")[0];
  const daily = last30Days(allExpenses);
  const last30 = daily.reduce((a, b) => a + b, 0);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <>
      <section className={`hero-card rise ${net > 0 ? "is-pos" : net < 0 ? "is-neg" : ""}`} style={{ "--i": 0 }}>
        <div className="hero-main">
          <span className="hero-label">
            {greeting()}, {firstName}
          </span>
          <div className={`hero-value ${net > 0 ? "pos" : net < 0 ? "neg" : ""}`}>
            {net > 0 ? "+" : net < 0 ? "−" : ""}
            <CountUp value={Math.abs(net)} format={inr} />
          </div>
          <p className="hero-caption">
            {net === 0
              ? "You're all square across every group."
              : net > 0
              ? `Overall you're owed, across ${plural(owedGroups, "group")}.`
              : `Overall you owe, across ${plural(owingGroups, "group")}.`}
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={onNewGroup}>
              <Icon name="plus" size={16} /> New group
            </button>
            <span className="hero-hint">
              <kbd>{MOD}K</kbd> to jump anywhere
            </span>
          </div>
        </div>
        <div className="hero-side">
          <span className="hero-side-label">Spent in the last 30 days</span>
          <strong className="hero-side-value">
            <CountUp value={last30} format={inr} />
          </strong>
          <div className="hero-spark">
            {last30 > 0 ? <Sparkline data={daily} /> : <p className="chart-empty">No spending yet</p>}
          </div>
          <div className="hero-side-axis">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </section>

      <div className="stats stats-3">
        <Stat
          i={1}
          label="You owe"
          icon="up"
          tone="neg"
          value={youOwe}
          sub={owingGroups ? `In ${plural(owingGroups, "group")}` : "Nothing to pay"}
        />
        <Stat
          i={2}
          label="Owed to you"
          icon="down"
          tone="pos"
          value={owedToYou}
          sub={owedGroups ? `In ${plural(owedGroups, "group")}` : "Nothing pending"}
        />
        <Stat
          i={3}
          label="Total tracked"
          icon="wallet"
          tone="blue"
          value={totalTracked}
          sub={`${plural(totalExpenses, "expense")} logged`}
        />
      </div>

      <section className="section-block">
        <div className="section-title">
          <h2>Your groups</h2>
          <span className="muted">{plural(groups.length, "group")}</span>
        </div>

        {groups.length === 0 ? (
          loaded && (
            <div className="card empty rise" style={{ "--i": 4 }}>
              <span className="empty-icon">
                <Icon name="users" size={20} />
              </span>
              <h3>Create your first group</h3>
              <p>Groups hold the people you share costs with — a trip, a flat, or a team lunch.</p>
              <button className="btn btn-primary" onClick={onNewGroup}>
                <Icon name="plus" size={16} /> New group
              </button>
            </div>
          )
        ) : (
          <div className="group-grid">
            {groups.map((g, idx) => (
              <button
                key={g._id || g.name}
                className="group-card rise"
                style={{ "--h": hueFor(g.name), "--i": Math.min(idx + 4, 12) }}
                onClick={() => onOpenGroup(g.name)}
              >
                <div className="gc-top">
                  <Monogram name={g.name} size="lg" />
                  <div className="gc-title">
                    <strong>{g.name}</strong>
                    <small>{plural(g.members?.length || 0, "member")}</small>
                  </div>
                  <Icon name="arrowRight" size={16} className="gc-arrow" />
                </div>
                <div className="gc-amount">
                  <span>Total spent · {plural(g.totalExpenses || 0, "expense")}</span>
                  <strong>{inr(g.totalAmount || 0)}</strong>
                </div>
                <div className="gc-foot">
                  <AvatarStack names={g.members || []} />
                  <BalanceBadge value={g.netOwe || 0} />
                </div>
              </button>
            ))}
            <button className="group-card is-new rise" style={{ "--i": Math.min(groups.length + 4, 12) }} onClick={onNewGroup}>
              <span className="gc-plus">
                <Icon name="plus" size={20} />
              </span>
              <strong>New group</strong>
              <small>A trip, a flat, a dinner…</small>
            </button>
          </div>
        )}
      </section>

      {groups.length > 0 && (
        <div className="overview-grid rise" style={{ "--i": 6 }}>
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Recent activity</h2>
                <p>Latest across all your groups</p>
              </div>
              <Icon name="activity" size={16} className="muted" />
            </div>
            <ActivityFeed expenses={allExpenses} user={user} onOpenGroup={onOpenGroup} />
          </section>

          <div>
            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Spending by category</h2>
                  <p>All groups combined</p>
                </div>
              </div>
              <div className="card-body">
                <CategoryBreakdown expenses={allExpenses} />
              </div>
            </section>
            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Last 30 days</h2>
                  <p>Daily spending across groups</p>
                </div>
              </div>
              <div className="card-body">
                <DailySpend expenses={allExpenses} />
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

export default Dashboard;
