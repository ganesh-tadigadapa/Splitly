import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, Monogram, inr, round2 } from "../ui";

/**
 * ⌘K / Ctrl+K palette. `commands` is a list of { id, label, hint?, icon?, group?, run }.
 */
function CommandPalette({ open, onClose, groups, commands, onOpenGroup }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo(() => {
    const groupItems = groups.map((g) => {
      const n = round2(g.netOwe || 0);
      return {
        id: `g:${g.name}`,
        section: "Groups",
        label: g.name,
        hint: n === 0 ? "Settled" : n > 0 ? `You owe ${inr(n)}` : `Owed ${inr(n)}`,
        monogram: g.name,
        run: () => onOpenGroup(g.name),
      };
    });
    const all = [...commands.map((c) => ({ ...c, section: "Actions" })), ...groupItems];
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((i) => i.label.toLowerCase().includes(term) || i.section.toLowerCase().includes(term));
  }, [groups, commands, q, onOpenGroup]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    listRef.current?.querySelector(".cmd-item.active")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (item) => {
    onClose();
    item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) run(items[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  let lastSection = null;

  return (
    <div className="cmd-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmd" role="dialog" aria-label="Command menu">
        <div className="cmd-input">
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search groups or type a command…"
            aria-label="Search"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cmd-list" ref={listRef} role="listbox">
          {items.length === 0 && <p className="cmd-empty">No matches for “{q}”.</p>}
          {items.map((item, i) => {
            const header = item.section !== lastSection ? item.section : null;
            lastSection = item.section;
            return (
              <div key={item.id}>
                {header && <div className="cmd-section">{header}</div>}
                <button
                  className={`cmd-item${i === active ? " active" : ""}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(item)}
                  role="option"
                  aria-selected={i === active}
                >
                  {item.monogram ? (
                    <Monogram name={item.monogram} size="xs" />
                  ) : (
                    <span className="cmd-icon">
                      <Icon name={item.icon || "chevron"} size={15} />
                    </span>
                  )}
                  <span className="cmd-label">{item.label}</span>
                  {item.hint && <span className="cmd-hint">{item.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="cmd-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
