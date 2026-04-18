import IntakeForm from "@/components/IntakeForm";

export default function IntakePage() {
  return (
    <div className="page">
      <main className="container">
        <h1>Get your AI survival roadmap</h1>
        <p>
          Answer focused questions (5-6 based on your branch), including your project domain and problem statement when applicable,
          to receive a brutally honest, India-aware roadmap built for the AI disruption era.
        </p>
        <div className="section">
          <IntakeForm />
        </div>
      </main>
    </div>
  );
}
