import { useMemo, useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORIES,
  inr,
  inrCompact,
  isSettlement,
  expenseDate,
  dayKey,
  shortDate,
  displayName,
  sameName,
} from "../ui";

const SERIES_BLUE = "#3987e5";

/* ---------- Spending by category: one segmented bar + legend table ---------- */
export function CategoryBreakdown({ expenses }) {
  const [hover, setHover] = useState(null);

  const { rows, total } = useMemo(() => {
    const sums = {};
    expenses.forEach((e) => {
      if (isSettlement(e)) return;
      const c = CATEGORIES.includes(e.category) ? e.category : "General";
      sums[c] = (sums[c] || 0) + e.amount;
    });
    const total = Object.values(sums).reduce((a, b) => a + b, 0);
    // keep the fixed category order for colour; sort rows by size for reading
    const rows = CATEGORIES.filter((c) => sums[c] > 0)
      .map((c) => ({ cat: c, value: sums[c], pct: total ? (sums[c] / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    return { rows, total };
  }, [expenses]);

  if (total === 0) {
    return <p className="chart-empty">No spending recorded yet.</p>;
  }

  let acc = 0;
  const segs = rows.map((r) => {
    const s = { ...r, start: acc };
    acc += r.pct;
    return s;
  });
  const hovered = segs.find((s) => s.cat === hover);

  return (
    <div className="catviz">
      <div className="catbar-wrap">
        <div className="catbar" role="img" aria-label="Spending split by category">
          {segs.map((s) => (
            <span
              key={s.cat}
              className={`catbar-seg${hover && hover !== s.cat ? " dim" : ""}`}
              style={{ flexGrow: s.value, background: CATEGORY_COLORS[s.cat] }}
              onMouseEnter={() => setHover(s.cat)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </div>
        {hovered && (
          <div className="chart-tip" style={{ left: `${hovered.start + hovered.pct / 2}%` }}>
            <strong>{hovered.cat}</strong>
            <span>
              {inr(hovered.value)} · {hovered.pct.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      <table className="legend-table">
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.cat}
              className={hover === r.cat ? "active" : ""}
              onMouseEnter={() => setHover(r.cat)}
              onMouseLeave={() => setHover(null)}
            >
              <td>
                <span className="legend-name">
                  <span className="swatch" style={{ background: CATEGORY_COLORS[r.cat] }} />
                  {r.cat}
                </span>
              </td>
              <td className="right num">{inr(r.value)}</td>
              <td className="right num muted">{r.pct.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Daily spend: single-series column chart ---------- */
function niceStep(max, ticks = 3) {
  const raw = max / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
  return step;
}

export function DailySpend({ expenses, days = 30 }) {
  const [hover, setHover] = useState(null);

  const data = useMemo(() => {
    const byDay = {};
    expenses.forEach((e) => {
      if (isSettlement(e)) return;
      const k = dayKey(expenseDate(e));
      byDay[k] = byDay[k] || { value: 0, count: 0 };
      byDay[k].value += e.amount;
      byDay[k].count += 1;
    });
    const out = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = dayKey(d);
      out.push({ key: k, date: d, value: byDay[k]?.value || 0, count: byDay[k]?.count || 0 });
    }
    return out;
  }, [expenses, days]);

  const max = Math.max(...data.map((d) => d.value));
  if (max === 0) {
    return <p className="chart-empty">No spending in the last {days} days.</p>;
  }

  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const total = data.reduce((s, d) => s + d.value, 0);
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="colchart">
      <div className="colchart-body">
        <div className="colchart-axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>
              {inrCompact(t)}
            </span>
          ))}
        </div>
        <div className="colchart-plot" role="img" aria-label={`Daily spending, last ${days} days, total ${inr(total)}`}>
          {ticks.map((t) => (
            <span key={t} className="gridline" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          <div className="cols">
            {data.map((d, i) => (
              <div
                key={d.key}
                className={`col${hover === i ? " active" : ""}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {d.value > 0 && (
                  <span
                    className="col-bar"
                    style={{ height: `${Math.max(2, (d.value / top) * 100)}%`, background: SERIES_BLUE }}
                  />
                )}
              </div>
            ))}
          </div>
          {h && (
            <div
              className="chart-tip"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%`, bottom: `${Math.min(100, (h.value / top) * 100)}%` }}
            >
              <strong>{shortDate(h.date)}</strong>
              <span>
                {h.value > 0 ? `${inr(h.value)} · ${h.count} ${h.count === 1 ? "expense" : "expenses"}` : "No spending"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="colchart-x" aria-hidden="true">
        <span>{shortDate(data[0].date)}</span>
        <span>{shortDate(data[Math.floor(data.length / 2)].date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/* ---------- Who paid: horizontal bars, value at the tip ---------- */
export function PaidBy({ expenses, members, user }) {
  const rows = useMemo(() => {
    const sums = {};
    members.forEach((m) => (sums[m.toLowerCase()] = { name: m, value: 0 }));
    expenses.forEach((e) => {
      if (isSettlement(e)) return;
      const k = e.paidBy.toLowerCase();
      sums[k] = sums[k] || { name: e.paidBy, value: 0 };
      sums[k].value += e.amount;
    });
    return Object.values(sums).sort((a, b) => b.value - a.value);
  }, [expenses, members]);

  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value === 0)) return <p className="chart-empty">Nobody has paid for anything yet.</p>;

  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hbar-row" key={r.name} title={`${displayName(r.name, user, members)}: ${inr(r.value)}`}>
          <span className="hbar-name">{sameName(r.name, user?.name) ? "You" : r.name}</span>
          <span className="hbar-track">
            {r.value > 0 && (
              <span className="hbar-fill" style={{ width: `${(r.value / max) * 100}%`, background: SERIES_BLUE }} />
            )}
          </span>
          <span className="hbar-val num">{inr(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
