import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";

import Login from "./components/Login";
import Chatbot from "./components/Chatbot";
import CreateGroupModal from "./components/CreateGroupModal";
import AddExpenseModal from "./components/AddExpenseModal";
import Dashboard from "./components/Dashboard";
import GroupDetail, { exportGroupCsv } from "./components/GroupDetail";
import GroupSettingsModal from "./components/GroupSettingsModal";
import CommandPalette from "./components/CommandPalette";
import { ToastProvider, useToast } from "./components/Toasts";
import { API, Icon, Logo, Monogram, round2, inr, MOD } from "./ui";

function AppInner() {
  const toast = useToast();
  const [user, setUserState] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved && localStorage.getItem("token") ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setUser = (u) => {
    setUserState(u);
    try {
      if (u) localStorage.setItem("user", JSON.stringify(u));
      else localStorage.removeItem("user");
    } catch {}
  };

  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [groupId, setGroupId] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [expenseModal, setExpenseModal] = useState({ open: false, expense: null });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (user?.name) {
        const who = encodeURIComponent(user.name);
        const [groupsRes, allRes] = await Promise.all([
          axios.get(`${API}/api/groups/user/${who}`),
          axios.get(`${API}/api/expenses/user/${who}/all`).catch(() => ({ data: [] })),
        ]);
        setMyGroups(groupsRes.data);
        setAllExpenses(allRes.data);
      }
      if (groupId) {
        const id = encodeURIComponent(groupId);
        const [exp, setl] = await Promise.all([
          axios.get(`${API}/api/expenses/${id}`),
          axios.get(`${API}/api/expenses/settlements/${id}`),
        ]);
        setExpenses(exp.data);
        setSettlements(setl.data);
      }
    } catch (err) {
      console.log("FETCH ERROR:", err);
      if (!err.response) toast({ message: "Can't reach the server. Is the backend running?", tone: "error" });
    } finally {
      setLoaded(true);
      setGroupLoading(false);
    }
  }, [groupId, user, toast]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // ⌘K / Ctrl+K opens the command palette
  useEffect(() => {
    if (!user) return;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [user]);

  const openGroup = useCallback(
    (gId) => {
      if (gId !== groupId) {
        setExpenses([]);
        setSettlements([]);
        setGroupLoading(true);
      }
      setGroupId(gId);
      setNavOpen(false);
      window.scrollTo(0, 0);
    },
    [groupId]
  );

  const goHome = () => {
    setGroupId(null);
    setNavOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    setGroupId(null);
    setMyGroups([]);
    setAllExpenses([]);
    localStorage.removeItem("token");
  };

  const currentGroup = groupId ? myGroups.find((g) => g.name === groupId) : null;
  const members = useMemo(() => currentGroup?.members || [], [currentGroup]);
  const chatGroup = groupId || (myGroups.length > 0 ? myGroups[0].name : "General");

  const commands = useMemo(() => {
    const list = [
      { id: "home", label: "Go to Overview", icon: "home", run: goHome },
      { id: "new-group", label: "Create a new group", icon: "plus", run: () => setIsGroupModalOpen(true) },
    ];
    if (groupId) {
      list.unshift({
        id: "add-expense",
        label: `Add expense to ${groupId}`,
        icon: "plus",
        run: () => setExpenseModal({ open: true, expense: null }),
      });
      list.push(
        {
          id: "export",
          label: `Export ${groupId} as CSV`,
          icon: "download",
          run: () => {
            exportGroupCsv(groupId, expenses, members);
            toast({ message: "CSV downloaded" });
          },
        },
        { id: "settings", label: `${groupId} settings`, icon: "settings", run: () => setIsSettingsOpen(true) }
      );
    }
    list.push(
      { id: "ask", label: "Ask AI about spending", icon: "message", run: () => setIsChatOpen(true) },
      { id: "logout", label: "Log out", icon: "logout", run: handleLogout }
    );
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, expenses, members]);

  if (!user) return <Login setUser={setUser} />;

  return (
    <div className={`app${navOpen ? " nav-open" : ""}`}>
      <aside className="sidebar" aria-label="Navigation">
        <div className="sidebar-top">
          <button onClick={goHome} aria-label="Splitly home">
            <Logo />
          </button>
        </div>

        <div className="sidebar-scroll">
          <button
            className="search-trigger"
            onClick={() => {
              setIsPaletteOpen(true);
              setNavOpen(false);
            }}
          >
            <Icon name="search" size={15} />
            <span>Search…</span>
            <kbd>{MOD}K</kbd>
          </button>

          <nav className="nav-section">
            <button className={`nav-item${!groupId ? " active" : ""}`} onClick={goHome}>
              <Icon name="home" size={16} />
              <span className="nav-label">Overview</span>
            </button>
            <button
              className="nav-item"
              onClick={() => {
                setIsChatOpen(true);
                setNavOpen(false);
              }}
            >
              <Icon name="message" size={16} />
              <span className="nav-label">Ask AI</span>
            </button>
          </nav>

          <nav className="nav-section" aria-label="Groups">
            <div className="nav-heading">
              <span>Groups</span>
              <button
                className="icon-btn"
                onClick={() => {
                  setIsGroupModalOpen(true);
                  setNavOpen(false);
                }}
                aria-label="New group"
                title="New group"
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
            {myGroups.length === 0 && loaded && <p className="nav-empty">No groups yet</p>}
            {myGroups.map((g) => {
              const n = round2(g.netOwe || 0);
              return (
                <button
                  key={g._id || g.name}
                  className={`nav-item${groupId === g.name ? " active" : ""}`}
                  onClick={() => openGroup(g.name)}
                  title={n === 0 ? "Settled" : n > 0 ? `You owe ${inr(n)}` : `You're owed ${inr(n)}`}
                >
                  <Monogram name={g.name} />
                  <span className="nav-label">{g.name}</span>
                  {n !== 0 && (
                    <span className={`nav-meta ${n > 0 ? "neg" : "pos"}`}>
                      {n > 0 ? "−" : "+"}
                      {inr(n)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-foot">
          <div className="user-card">
            <Monogram name={user.name} size="sm" round />
            <div className="who">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            <button className="icon-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="nav-scrim" onClick={() => setNavOpen(false)} />

      <div className="main">
        <div className="mobile-bar">
          <button onClick={goHome} aria-label="Splitly home">
            <Logo size={26} />
          </button>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="icon-btn" onClick={() => setIsPaletteOpen(true)} aria-label="Search">
              <Icon name="search" />
            </button>
            <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Icon name="menu" />
            </button>
          </div>
        </div>

        <main className="page">
          {groupId ? (
            <GroupDetail
              key={groupId}
              user={user}
              groupId={groupId}
              group={currentGroup}
              expenses={expenses}
              settlements={settlements}
              loading={groupLoading}
              onBack={goHome}
              onAddExpense={() => setExpenseModal({ open: true, expense: null })}
              onEditExpense={(e) => setExpenseModal({ open: true, expense: e })}
              onAsk={() => setIsChatOpen(true)}
              onSettings={() => setIsSettingsOpen(true)}
              onChanged={fetchData}
            />
          ) : (
            <Dashboard
              user={user}
              groups={myGroups}
              allExpenses={allExpenses}
              loaded={loaded}
              onOpenGroup={openGroup}
              onNewGroup={() => setIsGroupModalOpen(true)}
            />
          )}
        </main>
      </div>

      <Chatbot open={isChatOpen} onClose={() => setIsChatOpen(false)} groupId={chatGroup} />

      <CommandPalette
        open={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        groups={myGroups}
        commands={commands}
        onOpenGroup={openGroup}
      />

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        user={user}
        onGroupCreated={async (name) => {
          await fetchData();
          if (name) openGroup(name);
        }}
      />

      {groupId && (
        <AddExpenseModal
          isOpen={expenseModal.open}
          expense={expenseModal.expense}
          onClose={() => setExpenseModal({ open: false, expense: null })}
          user={user}
          groupId={groupId}
          members={members}
          onExpenseAdded={fetchData}
        />
      )}

      {groupId && isSettingsOpen && currentGroup && (
        <GroupSettingsModal
          group={currentGroup}
          user={user}
          onClose={() => setIsSettingsOpen(false)}
          onChanged={fetchData}
          onDeleted={() => {
            setIsSettingsOpen(false);
            setGroupId(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
