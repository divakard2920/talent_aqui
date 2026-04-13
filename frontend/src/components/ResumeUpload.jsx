import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react';

export function ResumeUpload({ onUpload, loading }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      }
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (file) {
      onUpload(file);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragActive ? 'rgba(0, 114, 198, 0.05)' : 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <FileText size={32} color="var(--accent-blue)" />
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontWeight: 500 }}>{file.name}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              style={{ marginLeft: '8px', padding: '4px', borderRadius: '50%', background: '#F4F4F4' }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={40} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <p style={{ margin: 0, fontWeight: 500 }}>Drop your resume here</p>
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              or click to browse (PDF only, max 10MB)
            </p>
          </>
        )}
      </div>

      {file && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-sarvam"
        >
          {loading ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
          {loading ? 'Uploading & Analyzing...' : 'Upload Resume'}
        </button>
      )}
    </div>
  );
}

export function CandidateResult({ candidate, onClose }) {
  const parsed = candidate.parsed_data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--brand-navy)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
        }}>
          {candidate.name?.charAt(0) || '?'}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{candidate.name}</h3>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{candidate.email}</p>
        </div>
        <CheckCircle size={24} color="#287A4F" style={{ marginLeft: 'auto' }} />
      </div>

      {parsed.summary && (
        <div style={{ background: '#F4F4F4', padding: '16px', borderRadius: '12px' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>{parsed.summary}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location</p>
          <p style={{ margin: 0, fontWeight: 500 }}>{parsed.location || candidate.location || 'N/A'}</p>
        </div>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Experience</p>
          <p style={{ margin: 0, fontWeight: 500 }}>{parsed.total_years_experience || 'N/A'} years</p>
        </div>
      </div>

      {parsed.skills?.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Skills</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {parsed.skills.slice(0, 15).map((skill, i) => (
              <span key={i} className="chip chip-navy" style={{ fontSize: '0.8rem' }}>{skill}</span>
            ))}
          </div>
        </div>
      )}

      <button onClick={onClose} className="btn-sarvam" style={{ marginTop: '8px' }}>
        Done
      </button>
    </div>
  );
}
