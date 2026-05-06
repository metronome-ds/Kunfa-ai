// Sidebar — fixed nav with Kunfa branding

const NAV_PRIMARY = [
  { id: "dashboard", label: "Dashboard", icon: "Dashboard" },
  { id: "deals", label: "Deals", icon: "Deals", badge: "12" },
  { id: "marketplace", label: "Marketplace", icon: "Marketplace" },
  { id: "community", label: "Community", icon: "Community" },
  { id: "startups", label: "Startups", icon: "Startups" },
  { id: "investors", label: "Investors", icon: "Investors" },
  { id: "invitations", label: "Invitations", icon: "Invitations" },
  { id: "faq", label: "FAQ", icon: "FAQ" },
];

const NAV_JOIN = [
  { id: "founder", label: "Founder Onboarding", icon: "Founder" },
  { id: "investor-join", label: "Join as Investor", icon: "InvestorJoin" },
];

function Sidebar({ active, onNavigate }) {
  const Ico = ({ name, ...p }) => {
    const C = window.I[name];
    return C ? <C {...p} /> : null;
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">K</div>
        <div className="brand-text">
          <div className="brand-name">Kunfa</div>
          <div className="brand-sub">Venture Intelligence</div>
        </div>
      </div>

      <nav className="nav">
        {NAV_PRIMARY.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <Ico name={item.icon} className="ico" size={15} />
            <span className="label">{item.label}</span>
            {item.badge && <span className="badge">{item.badge}</span>}
          </button>
        ))}

        <div className="nav-section-label">Join</div>
        {NAV_JOIN.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <Ico name={item.icon} className="ico" size={15} />
            <span className="label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="wallet">
        <span className="wallet-label">
          <Ico name="Wallet" size={13} />
          Wallet
        </span>
        <span className="wallet-amt">$100</span>
      </div>

      <div className="user">
        <div className="avatar">AO</div>
        <div className="user-info">
          <span className="user-name">Amara Okafor</span>
          <span className="user-role">Member</span>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
