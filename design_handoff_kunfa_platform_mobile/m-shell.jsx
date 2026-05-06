// Phone shell + status bar + tab bar

function Phone({ label, children }) {
  return (
    <div className="phone">
      <div className="notch"></div>
      <div className="phone-screen">
        <StatusBar />
        {children}
      </div>
      {label && <div className="phone-label">{label}</div>}
    </div>
  );
}

function StatusBar() {
  return (
    <div className="status">
      <span>9:41</span>
      <span className="status-right">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="0.6"/>
          <rect x="4.5" y="5" width="3" height="6" rx="0.6"/>
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.6"/>
          <rect x="13.5" y="0" width="3" height="11" rx="0.6"/>
        </svg>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="0.5" y="0.5" width="19" height="10" rx="2.5"/>
          <rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/>
          <path d="M21 4v3" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      </span>
    </div>
  );
}

const TABS = [
  { id: "home", label: "Home", icon: "Dashboard" },
  { id: "deals", label: "Deals", icon: "Deals" },
  { id: "community", label: "Community", icon: "Discussion" },
  { id: "invitations", label: "Invites", icon: "Mail" },
  { id: "profile", label: "Profile", icon: "InvestorJoin" },
];

function TabBar({ active }) {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };
  return (
    <div className="tabbar">
      {TABS.map((t) => (
        <div key={t.id} className={`tab-item ${active === t.id ? "active" : ""}`}>
          {active === t.id && <span className="tab-dot"></span>}
          <Ico name={t.icon} className="tab-icon" size={22} />
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function NavHeader({ title, back, action }) {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };
  return (
    <div className="nav-header">
      {back ? (
        <button className="back-btn">
          <Ico name="ChevRight" size={18} style={{ transform: "rotate(180deg)" }} />
          {back}
        </button>
      ) : <div className="nav-title">{title}</div>}
      <div className="nav-right">
        {action || (
          <>
            <button className="nav-btn"><Ico name="Search" size={16} /></button>
            <button className="nav-btn"><Ico name="Bell" size={16} /></button>
          </>
        )}
      </div>
    </div>
  );
}

window.Phone = Phone;
window.TabBar = TabBar;
window.NavHeader = NavHeader;
