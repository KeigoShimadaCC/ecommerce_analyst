export default function Home() {
  return (
    <main className="shell">
      <section className="workspace" aria-labelledby="page-title">
        <div className="intro">
          <p className="eyebrow">Merchant analytics</p>
          <h1 id="page-title">eCommerce Analyst</h1>
          <p className="summary">
            Ask a business question, review the verified result, and inspect
            the code used to produce it.
          </p>
        </div>
        <div className="placeholder" aria-label="Analysis workspace preview">
          <div className="question">What changed in repeat purchase revenue?</div>
          <div className="result">The analysis workspace will appear here.</div>
        </div>
      </section>
    </main>
  );
}
