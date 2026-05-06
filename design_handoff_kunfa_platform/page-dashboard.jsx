// Dashboard — Platform Overview

function PageDashboard() {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };

  const [welcomeOpen, setWelcomeOpen] = React.useState(true);

  return (
    <div className="page">
      {welcomeOpen && (
        <div className="welcome">
          <div className="welcome-left">
            <div className="welcome-icon"><Ico name="Spark" size={22} /></div>
            <div>
              <div className="welcome-title">Welcome — your $100 sourcing credit is live</div>
              <div className="welcome-sub">
                Every new Kunfa member receives a $100 credit toward AI-assisted deal scoring and diligence.
                Apply it on any deal in your inbox.
              </div>
            </div>
          </div>
          <div className="welcome-right">
            <button className="btn btn-on-dark">Browse deals</button>
          </div>
          <button className="welcome-close" onClick={() => setWelcomeOpen(false)} aria-label="Dismiss">
            <Ico name="Close" size={14} />
          </button>
        </div>
      )}

      <div className="page-head">
        <div className="page-head-text">
          <h1>Platform Overview</h1>
          <p>A live view of your portfolio, the Kunfa marketplace, and the deals scored by our intelligence layer this week.</p>
        </div>
        <button className="btn btn-primary">
          Browse Deals
          <Ico name="ArrowRight" size={14} />
        </button>
      </div>

      <div className="stat-grid">
        <Stat icon="Coins" label="Capital Deployed" value="$0" foot="Across 0 deals" />
        <Stat icon="Briefcase" label="Active Deals" value="0" foot="Tracking 0" />
        <Stat icon="Activity" label="Secondary Market" value="0" foot="Active listings" />
        <Stat icon="Users" label="Network" value="0" foot="Connections made" />
      </div>

      <div className="section-head">
        <h2>Recent Deals</h2>
        <a className="link" href="#">View all <Ico name="ArrowRight" size={11} /></a>
      </div>

      <div className="deals-empty">
        <div className="deals-empty-icon"><Ico name="Inbox" size={20} /></div>
        <div style={{ fontSize: 14, color: "var(--ink)", marginBottom: 4, fontWeight: 500 }}>No recent deals</div>
        <div style={{ fontSize: 13 }}>New scored deals will arrive here as they hit the marketplace.</div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, foot }) {
  const Ico = window.I[icon];
  return (
    <div className="stat">
      <div className="stat-head">
        <span>{label}</span>
        <Ico className="ico" size={14} />
      </div>
      <div className="stat-val">{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}

window.PageDashboard = PageDashboard;
