"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { MouseEvent } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";
import styles from "./page.module.css";

const randomRisk = () => Math.floor(65 + Math.random() * 10);

const featureCards = [
  {
    title: "Risk Score",
    body: "Quantified exposure based on city hiring pressure, role volatility, and automation impact.",
    tone: "violet",
  },
  {
    title: "Dead Skills",
    body: "Pinpoints oversupplied patterns and replaces them with high-signal, career-safe execution tasks.",
    tone: "pink",
  },
  {
    title: "Your Pivot + 90-Day Plan",
    body: "Detailed weekly strategy with concrete deliverables and differentiation moves to beat generic applicants.",
    tone: "cyan",
  },
];

export default function Home() {
  const [risk, setRisk] = useState(70);

  const handleParallaxMove = (event: MouseEvent<HTMLElement>) => {
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;

    node.style.setProperty("--px", `${relativeX * 10}px`);
    node.style.setProperty("--py", `${relativeY * 10}px`);
    node.style.setProperty("--ry", `${relativeX * 5}deg`);
    node.style.setProperty("--rx", `${relativeY * -5}deg`);
  };

  const handleParallaxLeave = (event: MouseEvent<HTMLElement>) => {
    const node = event.currentTarget;
    node.style.setProperty("--px", "0px");
    node.style.setProperty("--py", "0px");
    node.style.setProperty("--ry", "0deg");
    node.style.setProperty("--rx", "0deg");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        setRisk(randomRisk());
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.backgroundLayer} aria-hidden="true">
        <div className={styles.orbTopLeft} />
        <div className={styles.orbBottomRight} />
        <div className={styles.orbCenterRight} />
        <div className={styles.gridOverlay} />
        <div className={styles.noiseOverlay} />
      </div>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroBadgeWrap}>
            <span className={`${styles.glassPill} ${styles.reveal}`} style={{ "--delay": "0.05s" } as CSSProperties}>
              <span className={styles.pulseDot} />
              Live Career Intelligence
            </span>
          </div>

          <h1 className={`${styles.heroTitle} ${styles.reveal}`} style={{ "--delay": "0.1s" } as CSSProperties}>
            Your future got <span className={styles.gradientWord}>uncertain</span>. Now turn it into an unfair advantage.
          </h1>

          <p className={`${styles.heroSubtitle} ${styles.reveal}`} style={{ "--delay": "0.15s" } as CSSProperties}>
            PathPilot delivers an ultra-specific career survival strategy for Indian students by combining live market signals, deep profile diagnostics, and weekly execution guidance that hiring managers can actually trust.
          </p>

          <div className={`${styles.ctaRow} ${styles.reveal}`} style={{ "--delay": "0.2s" } as CSSProperties}>
            <Link className={styles.primaryButton} href="/intake">
              Get My Free Roadmap
            </Link>
            <a className={styles.glassButton} href="#shadow">
              See Shadow You
            </a>
          </div>

          <div className={`${styles.challengeLine} ${styles.reveal}`} style={{ "--delay": "0.25s" } as CSSProperties}>
            <Link href="/battle">⚔️ Challenge a Friend</Link>
          </div>

          <div className={`${styles.socialProof} ${styles.reveal}`} style={{ "--delay": "0.3s" } as CSSProperties}>
            <div className={styles.avatars} aria-hidden="true">
              <span className={styles.avatar}>AR</span>
              <span className={styles.avatar}>MK</span>
              <span className={styles.avatar}>PS</span>
              <span className={styles.avatar}>DV</span>
            </div>
            <p>Live beta cohort and waitlist</p>
          </div>
        </section>

        <section className={styles.riskWrap}>
          <div className={`${styles.glassCard} ${styles.riskCard} ${styles.reveal}`} style={{ "--delay": "0.35s" } as CSSProperties}>
            <p className={styles.riskLabel}>CAREER RISK SCORE</p>
            <AnimatedNumber value={risk} startFrom={68} durationMs={900} className={styles.riskNumber} />
            <p className={styles.riskReason}>
              You are one weak quarter away from becoming interchangeable unless you ship stronger evidence and role-specific outcomes.
            </p>
            <div className={styles.riskMiniGrid}>
              <div
                className={`${styles.glassCard} ${styles.miniCard} ${styles.parallax}`}
                onMouseMove={handleParallaxMove}
                onMouseLeave={handleParallaxLeave}
              >
                <h3>Live Signals</h3>
                <p>Hiring momentum, layoff pressure, and trend decay mapped weekly.</p>
              </div>
              <div
                className={`${styles.glassCard} ${styles.miniCard} ${styles.parallax}`}
                onMouseMove={handleParallaxMove}
                onMouseLeave={handleParallaxLeave}
              >
                <h3>Your Pivot</h3>
                <p>Execution-first path with practical weekly reports and measurable outcomes.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <p className={`${styles.sectionEyebrow} ${styles.reveal}`} style={{ "--delay": "0.4s" } as CSSProperties}>CORE ENGINE</p>
          <h2 className={`${styles.sectionTitle} ${styles.reveal}`} style={{ "--delay": "0.45s" } as CSSProperties}>
            Built For A Competitive Market
          </h2>
          <div className={styles.featureGrid}>
            {featureCards.map((item, index) => (
              <article
                key={item.title}
                className={`${styles.glassCard} ${styles.featureCard} ${styles.parallax} ${styles.reveal}`}
                style={{ "--delay": `${0.5 + index * 0.08}s` } as CSSProperties}
                onMouseMove={handleParallaxMove}
                onMouseLeave={handleParallaxLeave}
              >
                <div className={`${styles.featureIcon} ${styles[item.tone]}`} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.premiumVisualSection} ${styles.reveal}`} style={{ "--delay": "0.56s" } as CSSProperties}>
          <article
            className={`${styles.glassCard} ${styles.visualPanel} ${styles.parallax}`}
            onMouseMove={handleParallaxMove}
            onMouseLeave={handleParallaxLeave}
          >
            <div className={styles.visualBadge}>Company Signal Wall</div>
            <h3>Watch major AI companies shift product strategy in real time</h3>
            <p>
              Your roadmap aligns to real platform moves, not random internet noise. Track product direction, infra bets,
              and developer tooling trends that influence hiring.
            </p>
            <div className={styles.companyChipGrid}>
              <span>Google</span>
              <span>OpenAI</span>
              <span>Meta</span>
              <span>Microsoft</span>
              <span>AWS</span>
              <span>Netflix</span>
            </div>
            <div className={styles.visualOrbits} aria-hidden="true">
              <span className={styles.orbitOne} />
              <span className={styles.orbitTwo} />
              <span className={styles.orbitThree} />
            </div>
          </article>

          <aside
            className={`${styles.glassCard} ${styles.signalRail} ${styles.parallax}`}
            onMouseMove={handleParallaxMove}
            onMouseLeave={handleParallaxLeave}
          >
            <h4>Hover Highlights</h4>
            <ul>
              <li>Live stack-based company moves</li>
              <li>Project scalability stress test</li>
              <li>Execution-first weekly plans</li>
            </ul>
          </aside>
        </section>

        <section
          id="shadow"
          className={`${styles.glassCard} ${styles.shadowSection} ${styles.parallax} ${styles.reveal}`}
          style={{ "--delay": "0.6s" } as CSSProperties}
          onMouseMove={handleParallaxMove}
          onMouseLeave={handleParallaxLeave}
        >
          <div className={styles.shadowText}>
            <p className={styles.sectionEyebrow}>SHADOW YOU</p>
            <h2>Your Profile Twin Never Sleeps</h2>
            <p>
              Shadow You tracks skill decay, execution consistency, and role-fit signals so you can correct trajectory before interview windows close.
            </p>
            <div className={styles.shadowStats}>
              <div>
                <strong>79</strong>
                <span>Health Score</span>
              </div>
              <div>
                <strong>+6%</strong>
                <span>Monthly Lift</span>
              </div>
              <div>
                <strong>12</strong>
                <span>Critical Signals</span>
              </div>
            </div>
          </div>

          <div
            className={`${styles.glassCard} ${styles.healthWidget} ${styles.parallax}`}
            onMouseMove={handleParallaxMove}
            onMouseLeave={handleParallaxLeave}
          >
            <h3>Skill Decay Monitor</h3>
            <div className={styles.skillBarItem}>
              <div className={styles.skillBarMeta}><span>Backend depth</span><span>82%</span></div>
              <div className={styles.skillBarTrack}><span className={styles.skillBarGreen} style={{ "--target": "82%" } as CSSProperties} /></div>
            </div>
            <div className={styles.skillBarItem}>
              <div className={styles.skillBarMeta}><span>System design</span><span>57%</span></div>
              <div className={styles.skillBarTrack}><span className={styles.skillBarYellow} style={{ "--target": "57%" } as CSSProperties} /></div>
            </div>
            <div className={styles.skillBarItem}>
              <div className={styles.skillBarMeta}><span>Market relevance</span><span>34%</span></div>
              <div className={styles.skillBarTrack}><span className={styles.skillBarRed} style={{ "--target": "34%" } as CSSProperties} /></div>
            </div>

            <div className={styles.alertBox}>
              High risk alert: Without deeper project evidence in the next 3 weeks, shortlist conversion can drop sharply.
            </div>
          </div>
        </section>

        <section className={`${styles.battleSection} ${styles.reveal}`} style={{ "--delay": "0.7s" } as CSSProperties}>
          <span className={styles.vsBackdrop} aria-hidden="true">VS</span>
          <div className={styles.battleGrid}>
            <div
              className={`${styles.glassCard} ${styles.battleCard} ${styles.parallax}`}
              onMouseMove={handleParallaxMove}
              onMouseLeave={handleParallaxLeave}
            >
              <h3>Your Profile</h3>
              <p>Risk score, dead-skill exposure, and execution intensity measured against current market pressure.</p>
            </div>
            <div className={styles.vsDivider}>VS</div>
            <div
              className={`${styles.glassCard} ${styles.battleCard} ${styles.parallax}`}
              onMouseMove={handleParallaxMove}
              onMouseLeave={handleParallaxLeave}
            >
              <h3>Friend Profile</h3>
              <p>Direct side-by-side comparison with winner statement, gap analysis, and next strategic move.</p>
            </div>
          </div>
          <div className={styles.battleCtaRow}>
            <Link className={styles.primaryButton} href="/battle">
              ⚔️ Challenge a Friend
            </Link>
          </div>
        </section>

        <section
          className={`${styles.glassCard} ${styles.obituarySection} ${styles.parallax} ${styles.reveal}`}
          style={{ "--delay": "0.75s" } as CSSProperties}
          onMouseMove={handleParallaxMove}
          onMouseLeave={handleParallaxLeave}
        >
          <h3>💀 What happens if you do nothing</h3>
          <p className={styles.blurredText}>
            The market will not wait. Generic resumes fade, stale portfolios sink, and confidence drops when interview calls stop. Unlock the full report to view your detailed downside trajectory.
          </p>
          <Link className={styles.glassButton} href="/intake">
            Unlock To Read Full Scenario
          </Link>
        </section>
      </main>
    </div>
  );
}
