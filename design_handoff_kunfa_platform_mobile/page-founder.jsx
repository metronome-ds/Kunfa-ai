// Founder Onboarding form

function PageFounder() {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };
  return (
    <div className="page">
      <div className="form-page-head">
        <div className="form-page-icon"><Ico name="Lock" size={20} /></div>
        <div>
          <h1>Complete Your Startup Profile</h1>
          <p>You've been invited to raise on Kunfa. Enter your information once and complete the form below — we'll route it to matched investors.</p>
        </div>
      </div>

      <div className="steps">
        <span className="step done"><span className="step-num">1</span> Verify profile</span>
        <span className="step-arrow"><Ico name="ChevRight" size={11} /></span>
        <span className="step active"><span className="step-num">2</span> Tell us about your startup</span>
        <span className="step-arrow"><Ico name="ChevRight" size={11} /></span>
        <span className="step"><span className="step-num">3</span> Investor call</span>
        <span className="step-arrow"><Ico name="ChevRight" size={11} /></span>
        <span className="step"><span className="step-num">4</span> Deal goes live</span>
      </div>

      <div className="form-card">
        <div className="form-section-label">Startup information</div>
        <div className="form-grid">
          <div className="field">
            <label>Company Name <span className="req">*</span></label>
            <input type="text" placeholder="e.g. AcmeCo" />
          </div>
          <div className="field">
            <label>Invitation Code <span className="req">*</span></label>
            <input type="text" placeholder="STARTUP-XXXX" />
          </div>
          <div className="field full">
            <label>Tagline <span className="req">*</span></label>
            <input type="text" placeholder="One-line description of what you do" />
          </div>
          <div className="field full">
            <label>Description <span className="req">*</span></label>
            <textarea placeholder="Tell us more about your product, traction, and what you need." />
          </div>
          <div className="field">
            <label>Sector <span className="req">*</span></label>
            <select defaultValue=""><option value="" disabled>Select sector</option><option>Fintech</option><option>Climate</option><option>AI / ML</option><option>Biotech</option><option>Consumer</option></select>
          </div>
          <div className="field">
            <label>Stage <span className="req">*</span></label>
            <select defaultValue=""><option value="" disabled>Select stage</option><option>Pre-seed</option><option>Seed</option><option>Series A</option><option>Series B+</option></select>
          </div>
          <div className="field">
            <label>Founder Name <span className="req">*</span></label>
            <input type="text" placeholder="Jane Smith" />
          </div>
          <div className="field">
            <label>Founder Email <span className="req">*</span></label>
            <input type="email" placeholder="jane@company.com" />
          </div>
          <div className="field">
            <label>Location</label>
            <input type="text" placeholder="New York, NY" />
          </div>
          <div className="field">
            <label>Website</label>
            <input type="url" placeholder="https://company.com" />
          </div>
        </div>
        <button className="form-submit">Submit Application</button>
      </div>
    </div>
  );
}

window.PageFounder = PageFounder;
