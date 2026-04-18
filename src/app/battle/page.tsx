import BattleModeForm from "@/components/BattleModeForm";
import type { CSSProperties } from "react";

export default function BattleModePage() {
  return (
    <div className="page">
      <main className="container">
        <div className="reveal" style={{ "--delay": "0.05s" } as CSSProperties}>
          <p className="hero-eyebrow">Battle Mode</p>
          <h1>Challenge your friend. Only one profile survives the AI era.</h1>
          <p>
            Enter both profiles side by side and let PathPilot run a live survival battle.
            This is raw, comparative, and brutally honest.
          </p>
        </div>
        <section className="section">
          <BattleModeForm />
        </section>
      </main>
    </div>
  );
}
