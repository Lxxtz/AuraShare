"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <main className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '100vh', textAlign: 'center' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '3rem', maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '5rem', marginBottom: '1rem', letterSpacing: '4px' }}>AuraShare</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
          &gt; SECURE_UPLOAD_INITIALIZED...<br/>
          &gt; FILE_SHARING_PROTOCOL: ONLINE<br/>
          &gt; READY FOR INPUT_
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/login" className="btn-primary">
            Login
          </Link>
          <Link href="/register" className="btn-secondary">
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
