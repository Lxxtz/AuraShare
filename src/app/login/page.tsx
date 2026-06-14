"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRetroLoader, setShowRetroLoader] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
      } else {
        setShowRetroLoader(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (showRetroLoader) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-color)' }}>
        <h1 className="animate-fade-in" style={{ color: 'var(--primary-color)', fontSize: '4rem', letterSpacing: '5px' }}>SYSTEM ACCESS GRANTED</h1>
        <p style={{ color: 'var(--text-main)', fontSize: '1.5rem', marginTop: '1rem' }}>INITIALIZING PROTOCOLS...</p>
        <div style={{ marginTop: '3rem', width: '400px', height: '40px', border: '4px solid var(--secondary-color)', padding: '4px' }}>
          <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--primary-color)', animation: 'fillBar 2s linear forwards' }}></div>
        </div>
        <style>{`@keyframes fillBar { 0% { width: 0%; } 100% { width: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <main className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary-color)' }}>Welcome Back</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>Log in to your AuraShare account</p>

        {error && <div style={{ color: 'var(--error-color)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', padding: '0.5rem', border: '1px solid var(--error-color)', borderRadius: '4px' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
            <input 
              type="email" 
              className="input-field" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>
          
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Don't have an account? <Link href="/register" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>Register</Link>
        </div>
      </div>
    </main>
  );
}
