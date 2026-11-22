import { Icon, Monogram, AvatarStack, inr, round2 } from "../ui";

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

function Dashboard({ user, groups, loaded, onOpenGroup, onNewGroup }) {
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
          <p>Here's where you stand across all your groups.</p>
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
    </>
  );
}

export default Dashboard;
