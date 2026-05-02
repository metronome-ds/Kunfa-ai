// Join as Investor

function PageInvestor() {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };
  return (
    <div className="page">
      <div className="form-page-head">
        <div className="form-page-icon"><Ico name="Shield" size={20} /></div>
        <div>
          <h1>Join as Investor</h1>
          <p>Accredited investors only. Read and sign the membership agreement.</p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section-label">Investor profile</div>
        <div className="form-grid">
          <div className="field">
            <label>Full Name <span className="req">*</span></label>
            <input type="text" placeholder="Sasha Coker" />
          </div>
          <div className="field">
            <label>Invitation Code <span className="req">*</span></label>
            <input type="text" placeholder="INVESTOR-XXXX" />
          </div>
          <div className="field full">
            <label>Email <span className="req">*</span></label>
            <input type="email" placeholder="sasha@angel.com" />
          </div>
          <div className="field full">
            <label>Accreditation Status <span className="req">*</span></label>
            <select defaultValue=""><option value="" disabled>Select status</option><option>Accredited individual</option><option>Qualified purchaser</option><option>Family office</option><option>Institutional</option></select>
          </div>
          <div className="field full">
            <label>Bio</label>
            <textarea placeholder="Brief background as an investor…" />
          </div>
          <div className="field">
            <label>Location</label>
            <input type="text" placeholder="New York, NY" />
          </div>
          <div className="field">
            <label>LinkedIn URL</label>
            <input type="url" placeholder="https://linkedin.com/in/…" />
          </div>
          <div className="field full">
            <label>Investment Focus / Sectors</label>
            <input type="text" placeholder="e.g. Tech, Fintech, Climate (comma separated)" />
          </div>
          <div className="field">
            <label>Min Check Size (USD)</label>
            <input type="text" placeholder="25,000" />
          </div>
          <div className="field">
            <label>Max Check Size (USD)</label>
            <input type="text" placeholder="500,000" />
          </div>
        </div>
        <button className="form-submit">Join the Network</button>
      </div>
    </div>
  );
}

window.PageInvestor = PageInvestor;
