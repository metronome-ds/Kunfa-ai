// Main app — routes, tweaks, theming

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "amber",
  "fontPair": "newsreader-inter",
  "theme": "light"
}/*EDITMODE-END*/;

const ACCENTS = {
  amber:  { soft: "oklch(0.94 0.04 75)",  base: "oklch(0.72 0.12 70)",  ink: "oklch(0.38 0.08 60)",  softDark: "oklch(0.32 0.06 70)",  inkDark: "oklch(0.86 0.10 75)" },
  sage:   { soft: "oklch(0.94 0.04 150)", base: "oklch(0.66 0.10 150)", ink: "oklch(0.36 0.06 150)", softDark: "oklch(0.30 0.05 150)", inkDark: "oklch(0.84 0.09 150)" },
  mauve:  { soft: "oklch(0.94 0.04 320)", base: "oklch(0.66 0.10 330)", ink: "oklch(0.38 0.07 330)", softDark: "oklch(0.30 0.05 330)", inkDark: "oklch(0.84 0.09 330)" },
  iris:   { soft: "oklch(0.94 0.04 270)", base: "oklch(0.62 0.13 270)", ink: "oklch(0.38 0.09 270)", softDark: "oklch(0.30 0.06 270)", inkDark: "oklch(0.84 0.10 270)" },
  ember:  { soft: "oklch(0.94 0.04 35)",  base: "oklch(0.64 0.16 35)",  ink: "oklch(0.38 0.11 30)",  softDark: "oklch(0.30 0.07 35)",  inkDark: "oklch(0.84 0.11 35)" },
};

const FONT_PAIRS = {
  "newsreader-inter": { serif: '"Newsreader", Georgia, serif', sans: '"Inter Tight", "Inter", sans-serif' },
  "fraunces-inter":   { serif: '"Fraunces", Georgia, serif',   sans: '"Inter Tight", "Inter", sans-serif' },
  "sourceserif-ibm":  { serif: '"Source Serif 4", Georgia, serif', sans: '"IBM Plex Sans", sans-serif' },
  "playfair-dm":      { serif: '"Playfair Display", Georgia, serif', sans: '"DM Sans", sans-serif' },
};

function App() {
  const [route, setRoute] = React.useState("dashboard");
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply theme + accent + fonts to :root
  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = tweaks.theme;
    const a = ACCENTS[tweaks.accent] || ACCENTS.amber;
    const isDark = tweaks.theme === "dark";
    root.style.setProperty("--accent", a.base);
    root.style.setProperty("--accent-soft", isDark ? a.softDark : a.soft);
    root.style.setProperty("--accent-ink", isDark ? a.inkDark : a.ink);
    const f = FONT_PAIRS[tweaks.fontPair] || FONT_PAIRS["newsreader-inter"];
    root.style.setProperty("--serif", f.serif);
    root.style.setProperty("--sans", f.sans);
  }, [tweaks]);

  // scroll to top on route change
  React.useEffect(() => { window.scrollTo(0, 0); }, [route]);

  const Ico = ({ name, ...p }) => { const C = window.I[name]; return C ? <C {...p} /> : null; };

  const PAGES = {
    dashboard: { el: window.PageDashboard, crumb: "Platform" },
    deals: { el: window.PageDeals, crumb: "Deals" },
    marketplace: { el: window.PageMarketplace, crumb: "Marketplace" },
    community: { el: window.PageCommunity, crumb: "Community" },
    startups: { el: window.PageStartups, crumb: "Startups" },
    investors: { el: window.PageInvestors, crumb: "Investors" },
    invitations: { el: window.PageInvitations, crumb: "Invitations" },
    faq: { el: window.PageFAQ, crumb: "FAQ" },
    founder: { el: window.PageFounder, crumb: "Founder Onboarding" },
    "investor-join": { el: window.PageInvestor, crumb: "Join as Investor" },
  };

  const Page = PAGES[route]?.el || window.PageDashboard;
  const crumb = PAGES[route]?.crumb || "Dashboard";

  return (
    <div className="app">
      <Sidebar active={route} onNavigate={setRoute} />
      <main className="main">
        <div className="topbar">
          <div className="crumbs">Kunfa &nbsp;/&nbsp; <span>{crumb}</span></div>
          <div className="topbar-right">
            <div className="search">
              <Ico name="Search" size={13} />
              <span style={{ flex: 1 }}>Search deals, members, threads…</span>
              <kbd>⌘K</kbd>
            </div>
            <button className="icon-btn" aria-label="Notifications"><Ico name="Bell" size={16} /></button>
            <button className="icon-btn" aria-label="Settings"><Ico name="Settings" size={16} /></button>
          </div>
        </div>
        <Page />
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio
            value={tweaks.theme}
            options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
            onChange={(v) => setTweak("theme", v)}
          />
        </TweakSection>
        <TweakSection label="Accent">
          <TweakSelect
            value={tweaks.accent}
            options={[
              { value: "amber", label: "Amber" },
              { value: "sage", label: "Sage" },
              { value: "mauve", label: "Mauve" },
              { value: "iris", label: "Iris" },
              { value: "ember", label: "Ember" },
            ]}
            onChange={(v) => setTweak("accent", v)}
          />
        </TweakSection>
        <TweakSection label="Font pairing">
          <TweakSelect
            value={tweaks.fontPair}
            options={[
              { value: "newsreader-inter", label: "Newsreader + Inter" },
              { value: "fraunces-inter", label: "Fraunces + Inter" },
              { value: "sourceserif-ibm", label: "Source Serif + IBM Plex" },
              { value: "playfair-dm", label: "Playfair + DM Sans" },
            ]}
            onChange={(v) => setTweak("fontPair", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
