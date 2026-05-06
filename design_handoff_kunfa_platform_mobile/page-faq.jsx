// FAQ

const FAQS = [
  { q: "What is Kunfa?", a: "Kunfa is an AI-powered venture intelligence platform. We help accredited investors source, score, and manage early-stage deals — and help founders get investment-ready and matched with the right capital." },
  { q: "Who can join as an investor?", a: "Membership is invite-only and limited to accredited investors, qualified purchasers, family offices, and institutional investors. You'll need an invitation code from an existing member or partner." },
  { q: "What is the minimum investment per deal?", a: "Minimums are set by each deal but typically range from $5,000 to $25,000. Some allocations may have higher floors based on the stage and round structure." },
  { q: "How are startups vetted?", a: "Every startup is nominated by a verified member, then scored by Kunfa's intelligence layer across team, traction, market, and financials. Only the top-scoring companies are invited to raise." },
  { q: "What sectors do you focus on?", a: "We are sector-agnostic but see strong activity in fintech, climate, AI/ML, biotech, and consumer. Our matching engine routes deals based on your declared thesis." },
  { q: "Can I sell my investment?", a: "Yes. Kunfa runs a secondary marketplace where members can list and bid on existing positions, subject to issuer transfer rules." },
  { q: "How does the secondary marketplace work?", a: "Members list portions of their existing positions; matched buyers can bid; cleared trades route through our broker partner. Settlement typically takes 5–10 business days." },
  { q: "How do I refer a startup?", a: "Visit the Invitations page and use the 'Invite a Startup' card. Your nomination is tracked and you'll be credited as the referring member if they're admitted." },
  { q: "What fees do you charge?", a: "Kunfa charges a 1% platform fee per primary deal and a 1.5% spread on secondary trades. There are no annual membership fees for individual accredited investors." },
  { q: "Are investments guaranteed?", a: "No. All investments carry risk of partial or total loss. Kunfa provides intelligence, not investment advice. Read each deal's disclosure carefully." },
];

function PageFAQ() {
  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };
  const [open, setOpen] = React.useState(0);
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>FAQ</h1>
          <p>Everything you need to know about Kunfa, our membership model, and how the platform works.</p>
        </div>
      </div>

      <div className="faq-list">
        {FAQS.map((f, i) => (
          <div key={i} className={`faq-item ${open === i ? "open" : ""}`}>
            <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{f.q}</span>
              <Ico name="ChevDown" size={16} className="chev" />
            </button>
            {open === i && <div className="faq-a">{f.a}</div>}
          </div>
        ))}
      </div>

      <div className="faq-cta">
        <div className="faq-cta-text">
          <h3>Still have questions?</h3>
          <p>Drop us a line and our team will get back to you within 24 hours.</p>
        </div>
        <button className="btn btn-on-dark">Contact us</button>
      </div>
    </div>
  );
}

window.PageFAQ = PageFAQ;
