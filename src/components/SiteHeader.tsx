import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="logo-gradient" href="/">
          PATHPILOT
        </Link>
        <Link className="nav-pill-cta" href="/intake">
          Get My Roadmap
        </Link>
      </div>
    </header>
  );
}
