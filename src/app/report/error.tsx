"use client";

export default function ReportError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page">
      <main className="container">
        <div className="card">
          <h1>Report load failed</h1>
          <p className="error">{error.message || "Unexpected error occurred."}</p>
          <button className="button primary" type="button" onClick={reset}>
            Retry
          </button>
        </div>
      </main>
    </div>
  );
}
