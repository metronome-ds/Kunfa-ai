// Mobile screens

const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };

// 1. HOME / DASHBOARD
function MHome() {
  return (
    <Phone label="01 · Home">
      <NavHeader title="Kunfa" />
      <div className="screen-body">
        <div className="greet">
          <div className="greet-eyebrow">Wed · May 6</div>
          <h1>Good morning,<br/>Amara.</h1>
        </div>

        <div className="welcome-m">
          <div className="welcome-m-icon"><Ico name="Spark" size={16} /></div>
          <div className="welcome-m-text">
            <div className="welcome-m-title">$100 sourcing credit ready</div>
            <div className="welcome-m-sub">Apply on any deal scored by our intelligence layer.</div>
          </div>
        </div>

        <div className="stat-pair">
          <div className="stat-card">
            <div className="stat-card-head"><span>Capital deployed</span><Ico name="Coins" size={13} /></div>
            <div className="stat-card-val">$0</div>
            <div className="stat-card-foot">Across 0 deals</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-head"><span>Active deals</span><Ico name="Briefcase" size={13} /></div>
            <div className="stat-card-val">0</div>
            <div className="stat-card-foot">Tracking 0</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-head"><span>Secondary</span><Ico name="Activity" size={13} /></div>
            <div className="stat-card-val">0</div>
            <div className="stat-card-foot">Listings</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-head"><span>Network</span><Ico name="Users" size={13} /></div>
            <div className="stat-card-val">0</div>
            <div className="stat-card-foot">Connections</div>
          </div>
        </div>

        <div className="sect">
          <h3>For you today</h3>
          <a href="#">View all</a>
        </div>

        <div className="deal">
          <div className="deal-logo">CL</div>
          <div>
            <div className="deal-name">Clari Health</div>
            <div className="deal-meta">Biotech · Series A · $25k min</div>
          </div>
          <div className="score-pill">92</div>
        </div>
        <div className="deal">
          <div className="deal-logo">VR</div>
          <div>
            <div className="deal-name">Vert Energy</div>
            <div className="deal-meta">Climate · Seed · $10k min</div>
          </div>
          <div className="score-pill">88</div>
        </div>
        <div className="deal">
          <div className="deal-logo">OK</div>
          <div>
            <div className="deal-name">Okra Labs</div>
            <div className="deal-meta">AI/ML · Pre-seed · $5k min</div>
          </div>
          <div className="score-pill">85</div>
        </div>
      </div>
      <TabBar active="home" />
    </Phone>
  );
}

// 2. DEALS
function MDeals() {
  return (
    <Phone label="02 · Deals">
      <NavHeader title="Deals" />
      <div className="screen-body">
        <div className="search-m">
          <Ico name="Search" size={14} />
          <span>Search deals, sectors…</span>
        </div>

        <div className="tabs-m">
          <span className="tab-m active">All</span>
          <span className="tab-m">For you</span>
          <span className="tab-m">Closing soon</span>
          <span className="tab-m">Score 80+</span>
          <span className="tab-m">Saved</span>
        </div>

        <div className="deal">
          <div className="deal-logo">CL</div>
          <div>
            <div className="deal-name">Clari Health</div>
            <div className="deal-meta">Biotech · Series A · $8M round</div>
          </div>
          <div className="score-pill">92</div>
        </div>
        <div className="deal">
          <div className="deal-logo">VR</div>
          <div>
            <div className="deal-name">Vert Energy</div>
            <div className="deal-meta">Climate · Seed · $3.5M round</div>
          </div>
          <div className="score-pill">88</div>
        </div>
        <div className="deal">
          <div className="deal-logo">OK</div>
          <div>
            <div className="deal-name">Okra Labs</div>
            <div className="deal-meta">AI/ML · Pre-seed · $1.2M round</div>
          </div>
          <div className="score-pill">85</div>
        </div>
        <div className="deal">
          <div className="deal-logo">SF</div>
          <div>
            <div className="deal-name">Sefa Finance</div>
            <div className="deal-meta">Fintech · Series A · $12M round</div>
          </div>
          <div className="score-pill">81</div>
        </div>
        <div className="deal">
          <div className="deal-logo">NM</div>
          <div>
            <div className="deal-name">Nimbu</div>
            <div className="deal-meta">Consumer · Seed · $4M round</div>
          </div>
          <div className="score-pill">77</div>
        </div>
        <div className="deal">
          <div className="deal-logo">TB</div>
          <div>
            <div className="deal-name">Tela Bio</div>
            <div className="deal-meta">Biotech · Pre-seed · $2M round</div>
          </div>
          <div className="score-pill">74</div>
        </div>
      </div>
      <TabBar active="deals" />
    </Phone>
  );
}

// 3. COMMUNITY
function MCommunity() {
  return (
    <Phone label="03 · Community">
      <NavHeader title="Community" />
      <div className="screen-body">
        <div className="tabs-m">
          <span className="tab-m active">Discussions</span>
          <span className="tab-m">Events</span>
          <span className="tab-m">Sense Check</span>
          <span className="tab-m">Screen a Startup</span>
        </div>

        <div className="aside-m">
          <div className="aside-m-icon"><Ico name="Spark" size={14} /></div>
          <div className="aside-m-title">AI Deal Matching</div>
          <div className="aside-m-body">Surfacing deals matched to your thesis and check size.</div>
          <button className="aside-m-cta">Set my preferences</button>
        </div>

        <div className="sect">
          <h3>Discussions</h3>
          <a href="#">View all</a>
        </div>

        <div className="thread-m">
          <div className="thread-avatar">MO</div>
          <div>
            <div className="thread-m-meta">
              <span className="tag tag-accent">Due Diligence</span>
              <span style={{ fontSize: 10, color: "var(--accent-ink)", fontWeight: 600 }}>★ Pinned</span>
            </div>
            <div className="thread-m-title">How are folks handling reference calls on pre-seed founders with no operator history?</div>
            <div className="thread-m-foot"><span>Maya · 2h</span><span>12 replies</span></div>
          </div>
        </div>
        <div className="thread-m">
          <div className="thread-avatar">DM</div>
          <div>
            <div className="thread-m-meta">
              <span className="tag tag-ink">Deal Room</span>
            </div>
            <div className="thread-m-title">How do I evaluate a clinical-stage biotech doing a Series A on an FDA pathway?</div>
            <div className="thread-m-foot"><span>Daniel · 5h</span><span>7 replies</span></div>
          </div>
        </div>
        <div className="thread-m">
          <div className="thread-avatar">SK</div>
          <div>
            <div className="thread-m-meta">
              <span className="tag">Market Intel</span>
            </div>
            <div className="thread-m-title">Climate energy deal flow is accelerating — top 5 sectors I'm watching.</div>
            <div className="thread-m-foot"><span>Sarah · 1d</span><span>24 replies</span></div>
          </div>
        </div>
        <div className="thread-m">
          <div className="thread-avatar">RG</div>
          <div>
            <div className="thread-m-meta">
              <span className="tag">Secondary</span>
            </div>
            <div className="thread-m-title">Tips for negotiating allocation when investing through an angel syndicate.</div>
            <div className="thread-m-foot"><span>Rohan · 2d</span><span>9 replies</span></div>
          </div>
        </div>
      </div>
      <TabBar active="community" />
    </Phone>
  );
}

// 4. INVITATIONS
function MInvitations() {
  return (
    <Phone label="04 · Invitations">
      <NavHeader title="Invitations" />
      <div className="screen-body">
        <div className="referral-m">
          <h2>Earn $50 for every investor you refer</h2>
          <p>Plus a $100 sourcing credit when they fund their first deal.</p>
          <div className="referral-grid">
            <div className="referral-cell">
              <div className="referral-cell-val">0</div>
              <div className="referral-cell-label">Pending</div>
            </div>
            <div className="referral-cell">
              <div className="referral-cell-val">0</div>
              <div className="referral-cell-label">Joined</div>
            </div>
            <div className="referral-cell">
              <div className="referral-cell-val accent">$0</div>
              <div className="referral-cell-label">Earned</div>
            </div>
          </div>
        </div>

        <div className="invite-m">
          <div className="invite-m-head">
            <div className="invite-m-icon"><Ico name="Lock" size={14} /></div>
            <h3>Invite a Startup</h3>
          </div>
          <div className="invite-m-body">Send a founder a private invite to apply for Kunfa onboarding.</div>
          <button className="btn-m btn-m-ghost" style={{ padding: 11 }}>Invite a Startup</button>
        </div>

        <div className="invite-m">
          <div className="invite-m-head">
            <div className="invite-m-icon"><Ico name="Users" size={14} /></div>
            <h3>Refer an Investor</h3>
            <span className="tag tag-accent" style={{ marginLeft: "auto" }}>$50</span>
          </div>
          <div className="invite-m-body">Refer an accredited investor. Both earn when they fund their first deal.</div>
          <button className="btn-m btn-m-accent" style={{ padding: 11 }}>Refer an Investor</button>
        </div>

        <div className="callout-m">
          <Ico name="Info" size={13} />
          <span>Kunfa is member-referral only. Quality over quantity, always.</span>
        </div>

        <div className="sect" style={{ marginTop: 4 }}>
          <h3>Invitation history</h3>
        </div>
        <div className="empty-m">
          <div className="empty-m-icon"><Ico name="Mail" size={16} /></div>
          <h4>No invitations yet</h4>
          <p>Use the cards above to send your first.</p>
        </div>
      </div>
      <TabBar active="invitations" />
    </Phone>
  );
}

// 5. FOUNDER ONBOARDING
function MFounder() {
  return (
    <Phone label="05 · Founder Onboarding">
      <NavHeader back="Back" />
      <div className="screen-body">
        <div className="form-mhead">
          <div className="form-mhead-icon"><Ico name="Lock" size={16} /></div>
          <div>
            <h1>Complete Your Startup Profile</h1>
            <p>You've been invited to raise on Kunfa.</p>
          </div>
        </div>

        <div className="steps-m">
          <span className="step-m done"><span className="step-m-num">1</span> Verify</span>
          <Ico name="ChevRight" size={10} />
          <span className="step-m active"><span className="step-m-num">2</span> Startup</span>
          <Ico name="ChevRight" size={10} />
          <span className="step-m"><span className="step-m-num">3</span> Call</span>
          <Ico name="ChevRight" size={10} />
          <span className="step-m"><span className="step-m-num">4</span> Live</span>
        </div>

        <div className="field-m">
          <label>Company name *</label>
          <input type="text" placeholder="e.g. AcmeCo" />
        </div>
        <div className="field-m">
          <label>Invitation code *</label>
          <input type="text" placeholder="STARTUP-XXXX" />
        </div>
        <div className="field-m">
          <label>Tagline *</label>
          <input type="text" placeholder="One-line description" />
        </div>
        <div className="field-m">
          <label>Description *</label>
          <textarea placeholder="Tell us more about your product…" />
        </div>
        <div className="field-m-row">
          <div className="field-m">
            <label>Sector *</label>
            <select defaultValue=""><option value="" disabled>Select</option><option>Fintech</option><option>Climate</option><option>AI/ML</option></select>
          </div>
          <div className="field-m">
            <label>Stage *</label>
            <select defaultValue=""><option value="" disabled>Select</option><option>Pre-seed</option><option>Seed</option><option>Series A</option></select>
          </div>
        </div>
        <div className="field-m">
          <label>Founder email *</label>
          <input type="email" placeholder="jane@company.com" />
        </div>

        <button className="btn-m">Submit Application</button>
      </div>
      <TabBar active="profile" />
    </Phone>
  );
}

// 6. JOIN AS INVESTOR
function MInvestor() {
  return (
    <Phone label="06 · Join as Investor">
      <NavHeader back="Back" />
      <div className="screen-body">
        <div className="form-mhead">
          <div className="form-mhead-icon"><Ico name="Shield" size={16} /></div>
          <div>
            <h1>Join as Investor</h1>
            <p>Accredited investors only.</p>
          </div>
        </div>

        <div className="field-m">
          <label>Full name *</label>
          <input type="text" placeholder="Sasha Coker" />
        </div>
        <div className="field-m">
          <label>Invitation code *</label>
          <input type="text" placeholder="INVESTOR-XXXX" />
        </div>
        <div className="field-m">
          <label>Email *</label>
          <input type="email" placeholder="sasha@angel.com" />
        </div>
        <div className="field-m">
          <label>Accreditation status *</label>
          <select defaultValue=""><option value="" disabled>Select status</option><option>Accredited individual</option><option>Family office</option></select>
        </div>
        <div className="field-m">
          <label>Bio</label>
          <textarea placeholder="Brief background as an investor…" />
        </div>
        <div className="field-m">
          <label>Sectors of focus</label>
          <input type="text" placeholder="Tech, Fintech, Climate" />
        </div>
        <div className="field-m-row">
          <div className="field-m">
            <label>Min check</label>
            <input type="text" placeholder="$25,000" />
          </div>
          <div className="field-m">
            <label>Max check</label>
            <input type="text" placeholder="$500,000" />
          </div>
        </div>

        <button className="btn-m">Join the Network</button>
      </div>
      <TabBar active="profile" />
    </Phone>
  );
}

// 7. FAQ
function MFAQ() {
  const faqs = [
    { q: "What is Kunfa?", a: "An AI-powered venture intelligence platform — investors source, score, and manage deals; founders get investment-ready and matched with capital.", open: true },
    { q: "Who can join as an investor?", a: "Invite-only, limited to accredited investors, qualified purchasers, family offices, and institutional investors." },
    { q: "What is the minimum investment per deal?", a: "Minimums are deal-specific but typically $5,000–$25,000." },
    { q: "How are startups vetted?", a: "Each is nominated by a verified member, then scored by our intelligence layer across team, traction, market, and financials." },
    { q: "What sectors do you focus on?", a: "Sector-agnostic with strong activity in fintech, climate, AI/ML, biotech, and consumer." },
    { q: "Can I sell my investment?", a: "Yes — Kunfa runs a secondary marketplace subject to issuer transfer rules." },
    { q: "What fees do you charge?", a: "1% platform fee on primary deals, 1.5% spread on secondary trades. No annual membership fee for individuals." },
    { q: "Are investments guaranteed?", a: "No. All investments carry risk of partial or total loss. Read each disclosure carefully." },
  ];
  return (
    <Phone label="07 · FAQ">
      <NavHeader title="FAQ" />
      <div className="screen-body">
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "4px 0 16px" }}>
          Everything you need to know about Kunfa, our membership model, and how the platform works.
        </p>

        <div className="faq-list-m">
          {faqs.map((f, i) => (
            <div key={i} className={`faq-item-m ${f.open ? "open" : ""}`}>
              <button className="faq-q-m">
                <span>{f.q}</span>
                <Ico name="ChevDown" size={14} className="chev" />
              </button>
              {f.open && <div className="faq-a-m">{f.a}</div>}
            </div>
          ))}
        </div>

        <div className="faq-cta-m">
          <h3>Still have questions?</h3>
          <p>Drop us a line and our team will get back within 24 hours.</p>
          <button>Contact us</button>
        </div>
      </div>
      <TabBar active="profile" />
    </Phone>
  );
}

Object.assign(window, { MHome, MDeals, MCommunity, MInvitations, MFounder, MInvestor, MFAQ });
