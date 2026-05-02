// Community

const COMMUNITY_TABS = [
  { id: "discussions", label: "Discussions", icon: "Discussion" },
  { id: "events", label: "Events", icon: "Calendar" },
  { id: "sense-check", label: "Sense Check", icon: "CheckCircle" },
  { id: "screen-startup", label: "Screen a Startup", icon: "Eye" },
];

const THREADS = [
  {
    initials: "MO", name: "Maya Osei",
    tag: "Due Diligence", tagKind: "tag-accent",
    badge: "Pinned",
    title: "How are folks handling reference calls on pre-seed founders with no operator history?",
    sector: "Venture Ops", time: "2 hours ago", replies: 12, views: 187,
  },
  {
    initials: "DM", name: "Daniel Mensah",
    tag: "Deal Room", tagKind: "tag-ink",
    title: "How do I evaluate a clinical-stage biotech doing a Series A on an FDA pathway?",
    sector: "Biotech", time: "5 hours ago", replies: 7, views: 142,
  },
  {
    initials: "SK", name: "Sarah Kim",
    tag: "Market Intel", tagKind: "tag",
    title: "Climate energy deal flow is accelerating — here's the top 5 sectors I'm watching.",
    sector: "Climate", time: "1 day ago", replies: 24, views: 412,
  },
  {
    initials: "RG", name: "Rohan Gupta",
    tag: "Secondary Market", tagKind: "tag",
    title: "Tips for negotiating your allocation when investing through an angel syndicate.",
    sector: "Syndicates", time: "2 days ago", replies: 9, views: 198,
  },
  {
    initials: "EN", name: "Esosa Nwosu",
    tag: "Introductions", tagKind: "tag",
    title: "New to Kunfa — I run a $50M family office investing across early-stage AI in EMEA.",
    sector: "Family Office", time: "3 days ago", replies: 18, views: 327,
  },
];

function PageCommunity() {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };
  const [tab, setTab] = React.useState("discussions");

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Community</h1>
          <p>Where Kunfa members trade diligence, intel, and signal. Curated threads from operators, investors, and analysts.</p>
        </div>
        <button className="btn btn-primary"><Ico name="Plus" size={13} /> New Discussion</button>
      </div>

      <div className="tabs">
        {COMMUNITY_TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <Ico name={t.icon} className="ico" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 32 }}>
        <Stat3 icon="Users" label="Members" value="1,284" />
        <Stat3 icon="Discussion" label="Discussions this week" value="47" />
        <Stat3 icon="TrendUp" label="Top sectors" value="3" />
      </div>

      <div className="community-grid">
        <div>
          <div className="card-head" style={{ marginBottom: 4 }}>
            <h2 style={{ fontSize: 22 }}>Discussions</h2>
            <a className="link" href="#">View all <Ico name="ArrowRight" size={11} /></a>
          </div>
          <div className="card" style={{ padding: "4px 22px" }}>
            {THREADS.map((t, i) => <Thread key={i} {...t} />)}
          </div>
        </div>

        <div>
          <div className="aside-card">
            <div className="aside-card-icon"><Ico name="Spark" size={16} /></div>
            <div className="aside-card-title">AI Deal Matching</div>
            <div className="aside-card-body">Our intelligence layer surfaces deals matched to your thesis, check size, and stage preferences.</div>
            <button className="aside-cta">Set my preferences</button>
          </div>
          <div className="aside-card light">
            <div className="aside-card-icon"><Ico name="Compass" size={16} /></div>
            <div className="aside-card-title">Sense Check an Idea</div>
            <div className="aside-card-body">Drop a thesis or pitch and we'll match you with the right people in the network for a fast read.</div>
            <button className="aside-cta">Start a sense check</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat3({ icon, label, value }) {
  const Ico = window.I[icon];
  return (
    <div className="stat" style={{ alignItems: "center", textAlign: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--bg-sunk)", display: "grid", placeItems: "center", color: "var(--ink-soft)" }}>
        <Ico size={16} />
      </div>
      <div className="stat-val">{value}</div>
      <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{label}</div>
    </div>
  );
}

function Thread({ initials, name, tag, tagKind, badge, title, sector, time, replies, views }) {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };
  return (
    <div className="thread">
      <div className="thread-avatar">{initials}</div>
      <div>
        <div className="thread-meta">
          <span className={`tag ${tagKind}`}>{tag}</span>
          {badge && <span style={{ fontSize: 11, color: "var(--accent-ink)", fontWeight: 500 }}>★ {badge}</span>}
        </div>
        <div className="thread-title">{title}</div>
        <div className="thread-foot">
          <span>{name}</span>
          <span>·</span>
          <span>{sector}</span>
          <span>·</span>
          <span>{time}</span>
          <span>·</span>
          <span><Ico name="MessageCircle" size={12} /> {replies} replies</span>
          <span><Ico name="Eye" size={12} /> {views}</span>
        </div>
      </div>
    </div>
  );
}

window.PageCommunity = PageCommunity;
