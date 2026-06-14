"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatBytes } from '@/lib/utils';

interface FileHistory {
  id: string;
  original_name: string;
  unique_code: string;
  size: number;
  stored_size: number;
  compression: string;
  created_at: string;
}

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [compression, setCompression] = useState('None');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [stats, setStats] = useState<{original: number, compressed: number, type: string} | null>(null);
  
  const [downloadCode, setDownloadCode] = useState('');
  const [decompress, setDecompress] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  
  const [downloadInfo, setDownloadInfo] = useState<{name: string, originalSize: number, storedSize: number, compression: string} | null>(null);
  const [findingFile, setFindingFile] = useState(false);

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

  const handleUpload = async (method: 'direct' | 'compress') => {
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setGeneratedCode('');
    setStats(null);

    const formData = new FormData();
    formData.append('file', file);
    if (method === 'compress' && compression !== 'None') {
      formData.append('compression', compression);
    }

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
        if (data.compressionUsed) {
          setStats({
            original: data.originalSize,
            compressed: data.compressedSize,
            type: data.compressionUsed
          });
        }
        setFile(null);
        fetchHistory(); // refresh history
      }
    } catch (err) {
      setUploadError('An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleFindFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadCode) return;
    
    setFindingFile(true);
    setDownloadError('');
    setDownloadInfo(null);
    
    try {
      const res = await fetch(`/api/file/${downloadCode}/info`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      const data = await res.json();
      if (!res.ok) {
        setDownloadError(data.error || 'File not found');
      } else {
        setDownloadInfo({
          name: data.original_name,
          originalSize: data.original_size,
          storedSize: data.stored_size,
          compression: data.compression || 'None'
        });
      }
    } catch (err) {
      setDownloadError('Error finding file');
    } finally {
      setFindingFile(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadCode) return;

    setDownloading(true);
    setDownloadError('');

    try {
      const res = await fetch(`/api/download/${downloadCode}?decompress=${decompress}`, {
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
      
      // Keep info so they see what they downloaded, but clear code maybe?
      // Lets just keep it as is.
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

            {uploadError && (
              <div className="animate-fade-in" style={{ 
                color: 'var(--error-color)', 
                fontSize: '1.2rem', 
                fontFamily: 'var(--font-heading)', 
                border: '2px solid var(--error-color)', 
                padding: '0.75rem', 
                background: 'rgba(255, 0, 60, 0.1)', 
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textAlign: 'center',
                boxShadow: '0 0 10px rgba(255, 0, 60, 0.3)'
              }}>
                [ ERR ] {uploadError}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => handleUpload('direct')} 
                className="btn-secondary" 
                disabled={!file || uploading}
                style={{ flex: 1, fontSize: '1rem' }}
              >
                {uploading ? 'Uploading...' : 'Upload Directly'}
              </button>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
                Advanced Compression
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select className="input-field" value={compression} onChange={(e) => setCompression(e.target.value)} style={{ cursor: 'pointer', flex: 1 }}>
                  <option value="None">None</option>
                  <option value="Gzip">Gzip</option>
                  <option value="Brotli">Brotli</option>
                  <option value="Huffman">Huffman</option>
                </select>
                <button 
                  onClick={() => handleUpload('compress')} 
                  className="btn-primary" 
                  disabled={!file || uploading || compression === 'None'}
                  style={{ flex: 1, fontSize: '1rem' }}
                >
                  Compress & Upload
                </button>
              </div>
            </div>

          </div>

          {stats && (
            <div className="animate-fade-in" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(76, 201, 240, 0.1)', border: '1px solid var(--primary-color)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Compression Stats ({stats.type})</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Original: <strong>{formatBytes(stats.original)}</strong></span>
                <span>Compressed: <strong>{formatBytes(stats.compressed)}</strong></span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--success-color)' }}>
                Saved {(100 - (stats.compressed / stats.original) * 100).toFixed(1)}% space!
              </div>
            </div>
          )}

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
          <form onSubmit={handleFindFile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Unique Code</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  value={downloadCode} 
                  onChange={e => setDownloadCode(e.target.value)} 
                  required 
                  placeholder="Enter alphanumeric code"
                  style={{ flex: 2 }}
                />
                <button type="submit" className="btn-secondary" disabled={!downloadCode || findingFile} style={{ flex: 1, fontSize: '1rem' }}>
                  {findingFile ? 'Searching...' : 'Find File'}
                </button>
              </div>
            </div>
            {downloadError && (
              <div className="animate-fade-in" style={{ 
                color: 'var(--error-color)', 
                fontSize: '1.2rem', 
                fontFamily: 'var(--font-heading)', 
                border: '2px solid var(--error-color)', 
                padding: '0.75rem', 
                background: 'rgba(255, 0, 60, 0.1)', 
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textAlign: 'center',
                boxShadow: '0 0 10px rgba(255, 0, 60, 0.3)'
              }}>
                [ ERR ] {downloadError}
              </div>
            )}
          </form>

          {downloadInfo && (
            <div className="animate-fade-in" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--secondary-color)', borderRadius: '8px', background: 'rgba(247, 37, 133, 0.05)' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--secondary-color)' }}>File Found</h3>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Name:</strong> {downloadInfo.name}</p>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Size:</strong> {formatBytes(downloadInfo.originalSize)}</p>
              <p style={{ margin: '0 0 1rem 0' }}>
                <strong>Compression:</strong> {downloadInfo.compression !== 'None' ? <span style={{ color: 'var(--primary-color)' }}>{downloadInfo.compression} (Stored as {formatBytes(downloadInfo.storedSize)})</span> : 'None'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  type="checkbox" 
                  id="decompress-checkbox"
                  checked={decompress}
                  onChange={(e) => setDecompress(e.target.checked)}
                  style={{ cursor: 'pointer', width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary-color)' }}
                  disabled={downloadInfo.compression === 'None'}
                />
                <label htmlFor="decompress-checkbox" style={{ fontSize: '0.9rem', cursor: downloadInfo.compression === 'None' ? 'not-allowed' : 'pointer', color: downloadInfo.compression === 'None' ? 'gray' : 'inherit' }}>
                  Decompress file (if compressed)
                </label>
              </div>
              
              <button onClick={handleDownload} className="btn-primary" disabled={downloading} style={{ width: '100%' }}>
                {downloading ? 'Downloading...' : 'Download File'}
              </button>
            </div>
          )}
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
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-light)' }}>Size & Storage</th>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-light)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>{item.original_name}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{item.unique_code}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        {formatBytes(item.size)}
                        {item.compression !== 'None' && (
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--primary-color)' }}>
                            [{item.compression}: {formatBytes(item.stored_size)}]
                          </span>
                        )}
                      </td>
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
