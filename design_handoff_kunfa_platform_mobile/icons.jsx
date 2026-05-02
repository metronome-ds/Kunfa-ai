// Lucide-style line icons. Stroke 1.6, currentColor.
const _Icon = ({ size = 16, children, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >{children}</svg>
);

const I = {
  Dashboard: (p) => <_Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></_Icon>,
  Deals: (p) => <_Icon {...p}><path d="M3 7h18M3 12h18M3 17h18"/></_Icon>,
  Marketplace: (p) => <_Icon {...p}><path d="M3 9h18l-1.5 11h-15z"/><path d="M8 9V5a4 4 0 1 1 8 0v4"/></_Icon>,
  Community: (p) => <_Icon {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></_Icon>,
  Startups: (p) => <_Icon {...p}><path d="M5 15c0-3 2-7 7-9 5 2 7 6 7 9-2 1-4 1-7 1s-5 0-7-1z"/><circle cx="12" cy="10" r="1.5"/><path d="M9 17l-3 4M15 17l3 4"/></_Icon>,
  Investors: (p) => <_Icon {...p}><circle cx="9" cy="8" r="3"/><path d="M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="6" r="2"/><path d="M21 14c0-2-1.5-3.5-4-3.5"/></_Icon>,
  Invitations: (p) => <_Icon {...p}><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m3 7 9 6 9-6"/></_Icon>,
  FAQ: (p) => <_Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></_Icon>,
  Founder: (p) => <_Icon {...p}><path d="M12 3 2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5"/></_Icon>,
  InvestorJoin: (p) => <_Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></_Icon>,
  Wallet: (p) => <_Icon {...p}><path d="M3 7v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h13"/><circle cx="17" cy="14" r="1" fill="currentColor"/></_Icon>,
  Search: (p) => <_Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></_Icon>,
  Bell: (p) => <_Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></_Icon>,
  Sparkle: (p) => <_Icon {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></_Icon>,
  Trending: (p) => <_Icon {...p}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></_Icon>,
  Briefcase: (p) => <_Icon {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></_Icon>,
  Globe: (p) => <_Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></_Icon>,
  Discussion: (p) => <_Icon {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></_Icon>,
  Calendar: (p) => <_Icon {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></_Icon>,
  Check: (p) => <_Icon {...p}><polyline points="4 12 10 18 20 6"/></_Icon>,
  CheckCircle: (p) => <_Icon {...p}><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></_Icon>,
  Eye: (p) => <_Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></_Icon>,
  Shield: (p) => <_Icon {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></_Icon>,
  Lock: (p) => <_Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></_Icon>,
  Mail: (p) => <_Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></_Icon>,
  Plus: (p) => <_Icon {...p}><path d="M12 5v14M5 12h14"/></_Icon>,
  Close: (p) => <_Icon {...p}><path d="M6 6l12 12M18 6l-12 12"/></_Icon>,
  ChevDown: (p) => <_Icon {...p}><polyline points="6 9 12 15 18 9"/></_Icon>,
  ChevRight: (p) => <_Icon {...p}><polyline points="9 6 15 12 9 18"/></_Icon>,
  ArrowRight: (p) => <_Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></_Icon>,
  ArrowUpRight: (p) => <_Icon {...p}><path d="M7 17 17 7M7 7h10v10"/></_Icon>,
  Inbox: (p) => <_Icon {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 5H7.2a2 2 0 0 0-1.7.5z"/></_Icon>,
  Filter: (p) => <_Icon {...p}><polygon points="3 4 21 4 14 13 14 20 10 20 10 13"/></_Icon>,
  Activity: (p) => <_Icon {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></_Icon>,
  Building: (p) => <_Icon {...p}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01"/></_Icon>,
  Coins: (p) => <_Icon {...p}><circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6"/></_Icon>,
  Users: (p) => <_Icon {...p}><circle cx="9" cy="8" r="3"/><path d="M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="6" r="2"/><path d="M21 14c0-2-1.5-3.5-4-3.5"/></_Icon>,
  Target: (p) => <_Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></_Icon>,
  Gift: (p) => <_Icon {...p}><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8s-3-5-6-3 1 5 6 3zM12 8s3-5 6-3-1 5-6 3z"/></_Icon>,
  Info: (p) => <_Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></_Icon>,
  Settings: (p) => <_Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></_Icon>,
  Spark: (p) => <_Icon {...p}><path d="M12 2 14 9l7 2-7 2-2 7-2-7-7-2 7-2z"/></_Icon>,
  Heart: (p) => <_Icon {...p}><path d="M12 21s-7-4.5-9-9.5C1.7 7.5 4 4 7.5 4 9.7 4 11 5 12 6.5 13 5 14.3 4 16.5 4 20 4 22.3 7.5 21 11.5c-2 5-9 9.5-9 9.5z"/></_Icon>,
  MessageCircle: (p) => <_Icon {...p}><path d="M21 12a9 9 0 1 1-3.5-7.1L21 4l-1 4.5A9 9 0 0 1 21 12z"/></_Icon>,
  TrendUp: (p) => <_Icon {...p}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></_Icon>,
  Compass: (p) => <_Icon {...p}><circle cx="12" cy="12" r="9"/><polygon points="16 8 13 13 8 16 11 11"/></_Icon>,
  Sun: (p) => <_Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></_Icon>,
  Moon: (p) => <_Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></_Icon>,
};

window.I = I;
