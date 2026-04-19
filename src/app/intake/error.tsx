"use client";

export default function IntakeError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page">
      <main className="container">
        <div className="card">
          <h1>Intake failed</h1>
          <p className="error">{error.message || "Unexpected error occurred."}</p>
          <button className="button primary" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}
