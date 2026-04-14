import React, { useState } from 'react';
import { Search, Loader2, Mail, MapPin, Building, Star, GitFork, ExternalLink, Link2 } from 'lucide-react';

// Simple SVG icons for GitHub and LinkedIn
const GithubIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const LinkedinIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

// Helper to normalize names to Title Case
const formatName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function GitHubSearchForm({ onSearch, onSourceForJob, loading, jobs = [] }) {
  const openJobs = jobs.filter(j => j.status === 'open');
  const [mode, setMode] = useState('manual'); // 'manual' or 'job'
  const [selectedJobId, setSelectedJobId] = useState('');
  const [form, setForm] = useState({
    skills: '',
    location: '',
    language: '',
    min_repos: 5,
    min_followers: 10,
    max_results: 20,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'job' && selectedJobId) {
      // Use AI-powered job-based sourcing
      onSourceForJob(parseInt(selectedJobId), parseInt(form.max_results) || 20);
    } else {
      // Manual search
      const params = {
        ...form,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
        location: form.location || null,
        language: form.language || null,
        min_repos: parseInt(form.min_repos) || 5,
        min_followers: parseInt(form.min_followers) || 10,
        max_results: parseInt(form.max_results) || 20,
      };
      onSearch(params);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Mode Toggle */}
      {openJobs.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setMode('job')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: mode === 'job' ? '2px solid var(--brand-navy)' : '1px solid var(--border-light)',
              background: mode === 'job' ? '#E8EEF8' : 'white',
              cursor: 'pointer',
              fontWeight: mode === 'job' ? 600 : 400,
              color: mode === 'job' ? 'var(--brand-navy)' : 'var(--text-secondary)',
            }}
          >
            By Job
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: mode === 'manual' ? '2px solid var(--brand-navy)' : '1px solid var(--border-light)',
              background: mode === 'manual' ? '#E8EEF8' : 'white',
              cursor: 'pointer',
              fontWeight: mode === 'manual' ? 600 : 400,
              color: mode === 'manual' ? 'var(--brand-navy)' : 'var(--text-secondary)',
            }}
          >
            By Skills
          </button>
        </div>
      )}

      {/* Job-based sourcing */}
      {mode === 'job' && jobs.length > 0 && (
        <div style={{ background: '#E8EEF8', padding: '16px', borderRadius: '12px' }}>
          <label style={{ ...labelStyle, color: 'var(--brand-navy)', fontWeight: 600 }}>Job</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            style={{ ...selectStyle, background: 'white' }}
          >
            <option value="">Select a job</option>
            {openJobs.map(job => (
              <option key={job.id} value={job.id}>{job.title} - {job.department || 'General'}</option>
            ))}
          </select>
          <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Finds profiles matching job description, requirements, and skills
          </p>
        </div>
      )}

      {/* Manual search fields */}
      {mode === 'manual' && (
        <>
          <div>
            <label style={labelStyle}>Skills (comma separated)</label>
            <input
              name="skills"
              value={form.skills}
              onChange={handleChange}
              placeholder="e.g., python, langchain, openai"
              className="input-elegant"
              style={{ borderRadius: '12px' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Finds developers with ANY of these skills (OR matching)
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Location</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g., chennai, india"
                className="input-elegant"
                style={{ borderRadius: '12px' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Primary Language</label>
              <input
                name="language"
                value={form.language}
                onChange={handleChange}
                placeholder="e.g., Python"
                className="input-elegant"
                style={{ borderRadius: '12px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Min Repos</label>
              <input
                name="min_repos"
                type="number"
                min="0"
                value={form.min_repos}
                onChange={handleChange}
                className="input-elegant"
                style={{ borderRadius: '12px' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Min Followers</label>
              <input
                name="min_followers"
                type="number"
                min="0"
                value={form.min_followers}
                onChange={handleChange}
                className="input-elegant"
                style={{ borderRadius: '12px' }}
              />
            </div>
          </div>
        </>
      )}

      {/* Max results - shown in both modes */}
      <div>
        <label style={labelStyle}>Max Results</label>
        <input
          name="max_results"
          type="number"
          min="1"
          max="100"
          value={form.max_results}
          onChange={handleChange}
          className="input-elegant"
          style={{ borderRadius: '12px' }}
        />
      </div>

      <button
        type="submit"
        className="btn-sarvam"
        disabled={loading || (mode === 'job' && !selectedJobId)}
      >
        {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
        {loading ? 'Searching...' : mode === 'job' ? 'Find Candidates' : 'Search'}
      </button>
    </form>
  );
}

export function GitHubCandidateCard({ candidate, onImport, importing }) {
  const assessment = candidate.ai_assessment || {};

  return (
    <div
      style={{
        background: '#FAFAFA',
        border: '1px solid var(--border-light)',
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <img
          src={candidate.avatar_url}
          alt={formatName(candidate.name)}
          style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid var(--border-light)' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{formatName(candidate.name)}</h4>
            {candidate.hireable && <span className="chip chip-green" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Hireable</span>}
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>@{candidate.source_id}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {candidate.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> {candidate.location}
              </span>
            )}
            {candidate.company && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Building size={14} /> {candidate.company}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={14} /> {candidate.total_stars} stars
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GitFork size={14} /> {candidate.public_repos} repos
            </span>
          </div>
        </div>

        {assessment.overall_score && (
          <div style={{ textAlign: 'center', padding: '8px 16px', background: '#E8EEF8', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--brand-navy)' }}>{assessment.overall_score}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Score</p>
          </div>
        )}
      </div>

      {candidate.bio && (
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{candidate.bio}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {candidate.languages?.slice(0, 6).map((lang, i) => (
          <span key={i} className="chip chip-navy" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>{lang}</span>
        ))}
      </div>

      {assessment.summary && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: '#F4F4F4', padding: '12px', borderRadius: '12px' }}>
          {assessment.summary}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <a
          href={candidate.profile_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-pill"
          style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
        >
          <GithubIcon size={16} /> GitHub
        </a>

        {candidate.linkedin_url && (
          <a
            href={candidate.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill"
            style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
          >
            <LinkedinIcon size={16} /> LinkedIn
          </a>
        )}

        {candidate.email && (
          <a
            href={`mailto:${candidate.email}`}
            className="btn-pill"
            style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
          >
            <Mail size={16} /> Email
          </a>
        )}

        <button
          onClick={() => onImport(candidate.source_id)}
          disabled={importing}
          className="btn-sarvam"
          style={{ padding: '10px 20px' }}
        >
          {importing ? <Loader2 size={16} className="spin" /> : 'Import'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
};

const selectStyle = {
  width: '100%',
  padding: '14px 18px',
  borderRadius: '12px',
  border: '1px solid var(--border-strong)',
  fontFamily: 'var(--font-sans)',
  fontSize: '1rem',
  background: 'rgba(255, 255, 255, 0.5)',
  cursor: 'pointer',
};
