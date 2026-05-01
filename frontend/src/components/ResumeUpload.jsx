import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function ResumeUpload({ onUpload, loading }) {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({}); // { fileName: 'pending' | 'uploading' | 'success' | 'error' }
  const [isUploading, setIsUploading] = useState(false);
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        f => f.type === 'application/pdf'
      );
      addFiles(droppedFiles);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles) => {
    // Avoid duplicates by name
    const existingNames = new Set(files.map(f => f.name));
    const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
    setFiles(prev => [...prev, ...uniqueNewFiles]);
  };

  const removeFile = (fileName) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadStatus(prev => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    // Initialize all files as pending
    const initialStatus = {};
    files.forEach(f => { initialStatus[f.name] = 'pending'; });
    setUploadStatus(initialStatus);

    // Upload files sequentially
    for (const file of files) {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
      try {
        await onUpload(file);
        setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
      } catch (err) {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
      }
    }

    setIsUploading(false);
  };

  const clearAll = () => {
    setFiles([]);
    setUploadStatus({});
    if (inputRef.current) inputRef.current.value = '';
  };

  const completedCount = Object.values(uploadStatus).filter(s => s === 'success').length;
  const hasErrors = Object.values(uploadStatus).some(s => s === 'error');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
          borderRadius: '16px',
          padding: '32px 24px',
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          background: dragActive ? 'rgba(0, 114, 198, 0.05)' : 'transparent',
          transition: 'all 0.2s ease',
          opacity: isUploading ? 0.6 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        <Upload size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
        <p style={{ margin: 0, fontWeight: 500 }}>Drop resumes here</p>
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          or click to browse (PDF only, multiple files supported)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
          {files.map((file) => {
            const status = uploadStatus[file.name];
            return (
              <div
                key={file.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: status === 'success' ? '#F0FDF4' : status === 'error' ? '#FEF2F2' : '#F9FAFB',
                  borderRadius: '8px',
                  border: `1px solid ${status === 'success' ? '#10B981' : status === 'error' ? '#EF4444' : '#E5E7EB'}`,
                }}
              >
                <FileText size={20} color={status === 'success' ? '#10B981' : status === 'error' ? '#EF4444' : 'var(--accent-blue)'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {status === 'uploading' && <Loader2 size={18} className="spin" style={{ color: 'var(--accent-blue)' }} />}
                {status === 'success' && <CheckCircle size={18} style={{ color: '#10B981' }} />}
                {status === 'error' && <AlertCircle size={18} style={{ color: '#EF4444' }} />}
                {!status && !isUploading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                    style={{
                      padding: '4px',
                      borderRadius: '50%',
                      background: '#E5E7EB',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isUploading && completedCount === 0 && (
            <button
              onClick={clearAll}
              className="btn-pill"
              style={{ flex: 1 }}
            >
              Clear All
            </button>
          )}
          {completedCount === files.length && files.length > 0 ? (
            <button
              onClick={clearAll}
              className="btn-sarvam"
              style={{ flex: 1 }}
            >
              <CheckCircle size={18} />
              Done - Upload More
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isUploading || files.length === 0}
              className="btn-sarvam"
              style={{ flex: 2 }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Uploading {completedCount + 1} of {files.length}...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload {files.length} Resume{files.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
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
