import { useEffect, useState, useCallback } from "react";
import axios from "axios";

import Login from "./components/Login";
import Chatbot from "./components/Chatbot";
import CreateGroupModal from "./components/CreateGroupModal";
import AddExpenseModal from "./components/AddExpenseModal";
import Dashboard from "./components/Dashboard";
import GroupDetail from "./components/GroupDetail";
import { API, Icon, Logo, Monogram, round2, inr } from "./ui";

function App() {
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
  const [groupId, setGroupId] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (user?.name) {
        const res = await axios.get(`${API}/api/groups/user/${encodeURIComponent(user.name)}`);
        setMyGroups(res.data);
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
    } finally {
      setLoaded(true);
    }
  }, [groupId, user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const openGroup = (gId) => {
    if (gId !== groupId) {
      setExpenses([]);
      setSettlements([]);
    }
    setGroupId(gId);
    setNavOpen(false);
    window.scrollTo(0, 0);
  };

  const goHome = () => {
    setGroupId(null);
    setNavOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    setGroupId(null);
    setMyGroups([]);
    localStorage.removeItem("token");
  };

  if (!user) return <Login setUser={setUser} />;

  const currentGroup = groupId ? myGroups.find((g) => g.name === groupId) : null;
  const members = currentGroup?.members || [];
  const chatGroup = groupId || (myGroups.length > 0 ? myGroups[0].name : "General");

  return (
    <div className={`app${navOpen ? " nav-open" : ""}`}>
      <aside className="sidebar" aria-label="Navigation">
        <div className="sidebar-top">
          <button onClick={goHome} aria-label="Splitly home">
            <Logo />
          </button>
        </div>

        <div className="sidebar-scroll">
          <nav className="nav-section">
            <button className={`nav-item${!groupId ? " active" : ""}`} onClick={goHome}>
              <Icon name="home" size={16} />
              <span className="nav-label">Overview</span>
            </button>
            <button className="nav-item" onClick={() => { setIsChatOpen(true); setNavOpen(false); }}>
              <Icon name="message" size={16} />
              <span className="nav-label">Ask AI</span>
            </button>
          </nav>

          <nav className="nav-section" aria-label="Groups">
            <div className="nav-heading">
              <span>Groups</span>
              <button
                className="icon-btn"
                onClick={() => { setIsGroupModalOpen(true); setNavOpen(false); }}
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
                  {n !== 0 && <span className={`nav-meta ${n > 0 ? "neg" : "pos"}`}>{n > 0 ? "−" : "+"}{inr(n)}</span>}
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
          <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
        </div>

        <main className="page">
          {groupId ? (
            <GroupDetail
              user={user}
              groupId={groupId}
              group={currentGroup}
              expenses={expenses}
              settlements={settlements}
              onBack={goHome}
              onAddExpense={() => setIsExpenseModalOpen(true)}
              onAsk={() => setIsChatOpen(true)}
              onChanged={fetchData}
            />
          ) : (
            <Dashboard
              user={user}
              groups={myGroups}
              loaded={loaded}
              onOpenGroup={openGroup}
              onNewGroup={() => setIsGroupModalOpen(true)}
            />
          )}
        </main>
      </div>

      <Chatbot open={isChatOpen} onClose={() => setIsChatOpen(false)} groupId={chatGroup} />

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        user={user}
        onGroupCreated={fetchData}
      />

      {groupId && (
        <AddExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          user={user}
          groupId={groupId}
          members={members}
          onExpenseAdded={fetchData}
        />
      )}
    </div>
  );
}

export default App;
