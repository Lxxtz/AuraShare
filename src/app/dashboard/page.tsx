"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FileHistory {
  id: string;
  original_name: string;
  unique_code: string;
  size: number;
  created_at: string;
}

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  
  const [downloadCode, setDownloadCode] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const [history, setHistory] = useState<FileHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const router = useRouter();

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history', {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setHistory(data.files || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setGeneratedCode('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Bypass-Tunnel-Reminder': 'true' },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || 'Upload failed');
      } else {
        setGeneratedCode(data.code);
        setFile(null);
        fetchHistory(); // refresh history
      }
    } catch (err) {
      setUploadError('An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadCode) return;

    setDownloading(true);
    setDownloadError('');

    try {
      const res = await fetch(`/api/download/${downloadCode}`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      
      if (!res.ok) {
        const data = await res.json();
        setDownloadError(data.error || 'Download failed');
        setDownloading(false);
        return;
      }

      // Handle file download via blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract filename from header if possible, otherwise default
      const contentDisposition = res.headers.get('content-disposition');
      let filename = 'downloaded_file';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadCode('');
    } catch (err) {
      setDownloadError('An error occurred during download.');
    } finally {
      setDownloading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary-color)' }}>AuraShare</h1>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          Logout
        </button>
      </header>

      <main style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', flex: 1, alignItems: 'stretch' }}>
        
        {/* Upload Section */}
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', flex: '1 1 400px' }}>
          <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            Upload File
          </h2>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative', border: '2px dashed var(--surface-border)', borderRadius: '8px', padding: '2rem', textAlign: 'center', transition: 'border-color 0.3s', cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.2)' }}
                 onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                 onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--surface-border)'}>
              <input 
                type="file" 
                onChange={e => setFile(e.target.files?.[0] || null)} 
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                required
              />
              <p style={{ margin: 0, color: file ? 'var(--text-light)' : 'var(--text-main)', fontSize: '1rem' }}>
                {file ? file.name : 'Click or Drag file to upload'}
              </p>
              <small style={{ display: 'block', marginTop: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>Max size 100MB</small>
            </div>

            {uploadError && <div style={{ color: 'var(--error-color)', fontSize: '0.9rem' }}>{uploadError}</div>}
            
            <button type="submit" className="btn-primary" disabled={!file || uploading}>
              {uploading ? 'Uploading...' : 'Upload & Generate Code'}
            </button>
          </form>

          {generatedCode && (
            <div className="animate-fade-in" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid var(--success-color)', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--success-color)' }}>Success! Shareable Code:</p>
              <h3 style={{ margin: 0, fontSize: '2rem', letterSpacing: '2px' }}>{generatedCode}</h3>
            </div>
          )}
        </div>

        {/* Download Section */}
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', flex: '1 1 400px', animationDelay: '0.1s' }}>
          <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            Download File
          </h2>
          <form onSubmit={handleDownload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Unique Code</label>
              <input 
                type="text" 
                className="input-field" 
                value={downloadCode} 
                onChange={e => setDownloadCode(e.target.value)} 
                required 
                placeholder="Enter alphanumeric code"
              />
            </div>

            {downloadError && <div style={{ color: 'var(--error-color)', fontSize: '0.9rem' }}>{downloadError}</div>}
            
            <button type="submit" className="btn-primary" disabled={!downloadCode || downloading} style={{ borderColor: 'var(--secondary-color)', color: 'var(--secondary-color)' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--secondary-color)'; e.currentTarget.style.color = 'var(--bg-color)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--secondary-color)'; }}>
              {downloading ? 'Downloading...' : 'Retrieve & Download'}
            </button>
          </form>
        </div>

        {/* History Section */}
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', flex: '1 1 100%', animationDelay: '0.2s' }}>
          <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            Upload History
          </h2>
          {loadingHistory ? (
            <p>Loading history...</p>
          ) : history.length === 0 ? (
            <p style={{ color: 'var(--text-main)' }}>No files uploaded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-light)' }}>File Name</th>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-light)' }}>Code</th>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-light)' }}>Size</th>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-light)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>{item.original_name}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{item.unique_code}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{(item.size / 1024 / 1024).toFixed(2)} MB</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
