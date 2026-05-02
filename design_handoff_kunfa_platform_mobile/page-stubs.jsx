// Stub pages: Deals, Marketplace, Startups, Investors

function StubPage({ title, sub, children }) {
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function PageDeals() {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };
  const deals = [
    { initials: "CL", name: "Clari Health", sector: "Biotech · Series A", stage: "Open", round: "$8M", min: "$25k", score: "92" },
    { initials: "VR", name: "Vert Energy", sector: "Climate · Seed", stage: "Open", round: "$3.5M", min: "$10k", score: "88" },
    { initials: "OK", name: "Okra Labs", sector: "AI/ML · Pre-seed", stage: "Closing", round: "$1.2M", min: "$5k", score: "85" },
    { initials: "SF", name: "Sefa Finance", sector: "Fintech · Series A", stage: "Open", round: "$12M", min: "$50k", score: "81" },
    { initials: "NM", name: "Nimbu", sector: "Consumer · Seed", stage: "Open", round: "$4M", min: "$15k", score: "77" },
  ];
  return (
    <StubPage title="Deals" sub="Live primary rounds matched to your thesis. Updated every hour by the Kunfa intelligence layer.">
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button className="btn btn-ghost"><Ico name="Filter" size={13} /> All sectors</button>
        <button className="btn btn-ghost"><Ico name="Filter" size={13} /> All stages</button>
        <button className="btn btn-ghost"><Ico name="Filter" size={13} /> Score 70+</button>
        <span className="spacer" />
        <button className="btn btn-primary">Browse all</button>
      </div>
      {deals.map((d) => (
        <div key={d.name} className="deal-row">
          <div className="deal-logo">{d.initials}</div>
          <div>
            <div className="deal-name">{d.name}</div>
            <div className="deal-sector">{d.sector}</div>
          </div>
          <div className="deal-cell">
            <span className="deal-cell-label">Stage</span>
            <span className="deal-cell-val">{d.stage}</span>
          </div>
          <div className="deal-cell">
            <span className="deal-cell-label">Round</span>
            <span className="deal-cell-val">{d.round}</span>
          </div>
          <div className="deal-cell">
            <span className="deal-cell-label">Min check</span>
            <span className="deal-cell-val">{d.min}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="tag tag-accent">Score {d.score}</span>
            <button className="btn btn-ghost">View</button>
          </div>
        </div>
      ))}
    </StubPage>
  );
}

function PageMarketplace() {
  return (
    <StubPage title="Secondary Market" sub="Buy and sell positions in existing Kunfa deals. Cleared through our broker partner.">
      <div className="empty">
        <h3>No active listings right now</h3>
        <p>The secondary market clears Mondays and Thursdays. Set an alert to be notified.</p>
      </div>
    </StubPage>
  );
}

function PageStartups() {
  const cards = [
    { name: "Clari Health", sector: "Biotech", stage: "Series A", loc: "Boston, MA" },
    { name: "Vert Energy", sector: "Climate", stage: "Seed", loc: "Lagos, NG" },
    { name: "Okra Labs", sector: "AI/ML", stage: "Pre-seed", loc: "London, UK" },
    { name: "Sefa Finance", sector: "Fintech", stage: "Series A", loc: "Nairobi, KE" },
    { name: "Nimbu", sector: "Consumer", stage: "Seed", loc: "New York, NY" },
    { name: "Tela Bio", sector: "Biotech", stage: "Pre-seed", loc: "Berlin, DE" },
  ];
  return (
    <StubPage title="Startups" sub="Every Kunfa-onboarded company. Verified, scored, and updated quarterly.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {cards.map((c) => (
          <div key={c.name} className="card" style={{ padding: 20 }}>
            <div className="deal-logo" style={{ marginBottom: 14 }}>{c.name.slice(0, 2).toUpperCase()}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 19, marginBottom: 4 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 12 }}>{c.sector} · {c.stage} · {c.loc}</div>
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>View profile</button>
          </div>
        ))}
      </div>
    </StubPage>
  );
}

function PageInvestors() {
  const list = [
    { initials: "AO", name: "Amara Okafor", role: "Family Office · NY", check: "$25k–$500k" },
    { initials: "JL", name: "Jordan Lee", role: "Angel · SF", check: "$10k–$100k" },
    { initials: "TC", name: "Tomi Cole", role: "Syndicate Lead · LDN", check: "$50k–$1M" },
    { initials: "RK", name: "Ravi Kapoor", role: "Institutional · Mumbai", check: "$250k–$5M" },
  ];
  return (
    <StubPage title="Investors" sub="The Kunfa membership directory. Filterable by stage, geography, and check size.">
      <div className="card" style={{ padding: 0 }}>
        {list.map((p, i) => (
          <div key={i} className="deal-row" style={{ border: "none", borderRadius: 0, borderBottom: "1px solid var(--line)", marginBottom: 0, gridTemplateColumns: "40px 2fr 1fr auto" }}>
            <div className="avatar" style={{ background: "var(--ink)", color: "#fff" }}>{p.initials}</div>
            <div>
              <div className="deal-name">{p.name}</div>
              <div className="deal-sector">{p.role}</div>
            </div>
            <div className="deal-cell">
              <span className="deal-cell-label">Check size</span>
              <span className="deal-cell-val">{p.check}</span>
            </div>
            <button className="btn btn-ghost">Connect</button>
          </div>
        ))}
      </div>
    </StubPage>
  );
}

Object.assign(window, { PageDeals, PageMarketplace, PageStartups, PageInvestors });
