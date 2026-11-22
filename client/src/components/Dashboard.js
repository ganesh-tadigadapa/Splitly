import { Icon, Monogram, AvatarStack, inr, round2, sameName, relativeDay, isSettlement, expenseDate, MOD } from "../ui";
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

function Stat({ label, icon, value, tone, sub }) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className={`stat-value ${tone || ""}`}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {greeting()}, {firstName}
          </h1>
          <p>Here's where you stand across all your groups. Press <kbd>{MOD}K</kbd> to jump anywhere.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={onNewGroup}>
            <Icon name="plus" size={16} /> New group
          </button>
        </div>
      </div>

      <div className="stats">
        <Stat
          label="Net balance"
          icon="scale"
          value={net === 0 ? inr(0) : `${net > 0 ? "+" : "−"}${inr(net)}`}
          tone={net > 0 ? "pos" : net < 0 ? "neg" : ""}
          sub={net === 0 ? "You're all square" : net > 0 ? "Overall you're owed" : "Overall you owe"}
        />
        <Stat
          label="You owe"
          icon="up"
          value={inr(youOwe)}
          sub={owingGroups ? `In ${owingGroups} ${owingGroups === 1 ? "group" : "groups"}` : "Nothing to pay"}
        />
        <Stat
          label="Owed to you"
          icon="down"
          value={inr(owedToYou)}
          sub={owedGroups ? `In ${owedGroups} ${owedGroups === 1 ? "group" : "groups"}` : "Nothing pending"}
        />
        <Stat
          label="Total tracked"
          icon="wallet"
          value={inr(totalTracked)}
          sub={`${totalExpenses} ${totalExpenses === 1 ? "expense" : "expenses"} logged`}
        />
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Groups</h2>
            <p>{groups.length} {groups.length === 1 ? "group" : "groups"}</p>
          </div>
          {groups.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={onNewGroup}>
              <Icon name="plus" size={14} /> New group
            </button>
          )}
        </div>

        {groups.length === 0 ? (
          loaded && (
            <div className="empty">
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
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hide-sm">Members</th>
                <th className="right hide-sm">Expenses</th>
                <th className="right hide-sm">Total spent</th>
                <th className="right">Your balance</th>
                <th className="shrink" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={g._id || g.name}
                  className="clickable"
                  onClick={() => onOpenGroup(g.name)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onOpenGroup(g.name)}
                >
                  <td>
                    <div className="cell-main">
                      <Monogram name={g.name} />
                      <div>
                        <strong>{g.name}</strong>
                        <small>{g.members?.length || 0} members</small>
                      </div>
                    </div>
                  </td>
                  <td className="hide-sm">
                    <AvatarStack names={g.members || []} />
                  </td>
                  <td className="right hide-sm num muted">{g.totalExpenses || 0}</td>
                  <td className="right hide-sm amount">{inr(g.totalAmount || 0)}</td>
                  <td className="right">
                    <BalanceBadge value={g.netOwe || 0} />
                  </td>
                  <td className="shrink">
                    <Icon name="chevron" size={16} className="row-chevron" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {groups.length > 0 && (
        <div className="overview-grid">
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
