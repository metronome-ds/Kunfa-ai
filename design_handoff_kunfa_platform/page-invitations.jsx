// Invitations

function PageInvitations() {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Invitations</h1>
          <p>Grow the Kunfa network. Membership is invite-only — every member earns the right to refer.</p>
        </div>
      </div>

      <div className="referral-banner">
        <div className="badge-time"><Ico name="Sparkle" size={11} /> Limited time · Ends 30 June 2026</div>
        <h2>Earn $50 for every investor you refer</h2>
        <p>Plus a $100 sourcing credit when your referral funds their first deal — stackable with your member benefits.</p>
        <div className="referral-stats">
          <div className="referral-stat">
            <div className="referral-stat-val">0</div>
            <div className="referral-stat-label">Pending</div>
          </div>
          <div className="referral-stat">
            <div className="referral-stat-val">0</div>
            <div className="referral-stat-label">Joined</div>
          </div>
          <div className="referral-stat">
            <div className="referral-stat-val accent">$0</div>
            <div className="referral-stat-label">Earned</div>
          </div>
        </div>
      </div>

      <div className="invite-cards">
        <div className="invite-card">
          <div className="invite-card-head">
            <div className="invite-card-icon"><Ico name="Lock" size={16} /></div>
            <h3>Invite a Startup</h3>
          </div>
          <div className="invite-card-body">
            Send a founder a private invite to apply for Kunfa onboarding. They'll skip the public waitlist.
          </div>
          <div className="invite-card-bullets">
            <div className="invite-card-bullet"><Ico name="Check" size={13} /> Bypasses waitlist for invited founder</div>
            <div className="invite-card-bullet"><Ico name="Check" size={13} /> Tracked attribution back to you</div>
          </div>
          <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>Invite a Startup</button>
        </div>

        <div className="invite-card">
          <div className="invite-card-head">
            <div className="invite-card-icon"><Ico name="Users" size={16} /></div>
            <h3>Refer an Investor <span className="tag tag-accent" style={{ marginLeft: 6 }}>$50 per referral</span></h3>
          </div>
          <div className="invite-card-body">
            Refer an accredited investor. They review-up — when they fund their first deal, you both earn.
          </div>
          <div className="invite-card-bullets">
            <div className="invite-card-bullet"><Ico name="Check" size={13} /> $50 credit to you on signup</div>
            <div className="invite-card-bullet"><Ico name="Check" size={13} /> +$100 to you on first funded deal</div>
          </div>
          <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }}>Refer an Investor</button>
        </div>
      </div>

      <div className="callout">
        <Ico name="Info" size={14} />
        <span>Kunfa is member-referral only. Every startup on the platform was nominated by a verified investor or operator. Quality over quantity, always.</span>
      </div>

      <div className="section-head" style={{ marginTop: 8 }}>
        <h2>Invitation history</h2>
      </div>

      <div className="empty">
        <div style={{ width: 40, height: 40, margin: "0 auto 14px", display: "grid", placeItems: "center", borderRadius: "50%", background: "var(--bg-sunk)", color: "var(--ink-faint)" }}>
          <Ico name="Mail" size={18} />
        </div>
        <h3>No invitations yet</h3>
        <p>Use the cards above to send your first one.</p>
      </div>
    </div>
  );
}

window.PageInvitations = PageInvitations;
