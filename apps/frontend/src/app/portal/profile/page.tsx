export default function ProfilePage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Company Profile</h1>
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>Profile editing is available after account verification. Contact procurement@burgergov.com to update your company information.</p>
          <a href="/portal/dashboard" className="btn btn-navy" style={{ marginTop: '1rem' }}>Back to Dashboard</a>
        </div>
      </div>
    </section>
  );
}
