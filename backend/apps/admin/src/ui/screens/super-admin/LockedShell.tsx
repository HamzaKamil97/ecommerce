export function LockedShell({ title, comingIn }: { title: string; comingIn: string }) {
  return (
    <div style={{ padding: 'var(--space-3xl)', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>🔒</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.01em', marginBottom: 6 }}>
        {title}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 16 }}>
        Mockup designed today, built when {comingIn}.
      </p>
      <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>
        See <code>docs/superpowers/specs/2026-05-27-phase-h3-2-design.md</code> §6.4 for the full design.
      </p>
    </div>
  );
}
