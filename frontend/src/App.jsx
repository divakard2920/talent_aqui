import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Users,
  FileText,
  Code,
  ArrowRight,
  TrendingUp,
  Search,
  Plus,
  Upload,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Mail,
  MapPin,
  Trash2,
  Edit3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import './index.css';
import knorrLogo from './assets/knorr.png';
import { jobsApi, candidatesApi, resumeApi, githubApi } from './services/api';
import { Modal, JobForm, GitHubSearchForm, GitHubCandidateCard, ResumeUpload, CandidateResult } from './components';

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

// Toast notification component
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: type === 'success' ? '#287A4F' : type === 'error' ? '#DC2626' : '#2F5C8F',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 200,
      }}
    >
      {type === 'success' ? <CheckCircle size={20} /> : type === 'error' ? <XCircle size={20} /> : <AlertCircle size={20} />}
      {message}
    </motion.div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div className="mesh-background">
        <div className="mesh-background-glow"></div>
      </div>

      {/* Floating Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        padding: '24px',
        transition: 'all 0.3s ease',
        transform: scrolled ? 'translateY(-10px)' : 'none',
      }}>
        <div style={{
          background: scrolled ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-light)',
          borderRadius: '9999px',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
          transition: 'all 0.3s ease',
        }}>
          <div className="flex-center" style={{ marginRight: '16px' }}>
            <img src={knorrLogo} alt="Knorr-Bremse" style={{ height: '32px', marginRight: '12px', borderRadius: '4px' }} />
            <span style={{ fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--brand-navy)', letterSpacing: '-0.02em' }}>
              Knorr-Bremse <span style={{ fontWeight: 400, color: 'var(--text-primary)' }}>Talent AI</span>
            </span>
          </div>

          <nav style={{ display: 'flex', gap: '8px' }}>
            {['dashboard', 'jobs', 'candidates', 'github'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? '#131313' : 'transparent',
                  color: activeTab === tab ? '#FFFFFF' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === tab ? 'var(--btn-shadow-inset)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {tab === 'github' && <GithubIcon size={14} />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{ paddingTop: '140px', paddingBottom: '80px' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <DashboardView key="dashboard" onNavigate={setActiveTab} />}
          {activeTab === 'jobs' && <JobsView key="jobs" showToast={showToast} />}
          {activeTab === 'candidates' && <CandidatesView key="candidates" showToast={showToast} />}
          {activeTab === 'github' && <GitHubView key="github" showToast={showToast} />}
        </AnimatePresence>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  );
}

// --- Dashboard View ---
function DashboardView({ onNavigate }) {
  const [stats, setStats] = useState({ jobs: 0, candidates: 0 });
  const [topCandidates, setTopCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          jobsApi.list(),
          candidatesApi.list({ limit: 5 }),
        ]);
        setStats({
          jobs: jobsRes.data.length,
          candidates: candidatesRes.data.length,
        });
        setTopCandidates(candidatesRes.data.slice(0, 3));
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '900px', margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1.1 }}>
          Powering your <br />AI-first hiring.
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
          Automatically source developers, parse resumes, and discover perfect matches with frontier models.
        </p>
        <div className="flex-center gap-3">
          <button className="btn-sarvam" onClick={() => onNavigate('candidates')}>
            Review Candidates
          </button>
          <button className="btn-pill" onClick={() => onNavigate('github')}>
            <GithubIcon size={18} /> Source GitHub
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {[
          { label: 'Active Jobs', value: loading ? '-' : stats.jobs, icon: <Briefcase size={20} color="var(--text-secondary)" /> },
          { label: 'Candidates', value: loading ? '-' : stats.candidates, icon: <Users size={20} color="var(--text-secondary)" /> },
          { label: 'Avg Match Score', value: '85%', icon: <TrendingUp size={20} color="var(--text-secondary)" /> }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
            className="sovereign-card" style={{ padding: '24px' }}
          >
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div style={{ background: '#F4F4F4', padding: '10px', borderRadius: '50%' }}>{stat.icon}</div>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>{stat.label}</p>
            <h3 style={{ fontSize: '2rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="sovereign-card" style={{ background: 'var(--bg-card)' }}>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.5rem' }}>Recent Candidates</h3>
          <button className="btn-pill" onClick={() => onNavigate('candidates')}>
            View All <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ padding: '40px' }}>
            <Loader2 size={24} className="spin" />
          </div>
        ) : topCandidates.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
            No candidates yet. Upload resumes or search GitHub to get started.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {topCandidates.map((candidate, i) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
                className="flex-between"
                style={{ padding: '16px', background: '#FAFAFA', borderRadius: '20px', border: '1px solid var(--border-light)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', background: 'var(--text-primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    {candidate.name?.charAt(0) || '?'}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{candidate.name}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{candidate.email}</p>
                  </div>
                </div>
                <span className="chip chip-blue">{candidate.source}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Jobs View ---
function JobsView({ showToast }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobMatches, setJobMatches] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [shortlistingId, setShortlistingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'shortlisted', 'rejected', 'pending'

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsApi.list();
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCreateJob = async (data) => {
    setCreating(true);
    try {
      const res = await jobsApi.create(data);
      setJobs(prev => [res.data, ...prev]);
      setShowCreateModal(false);
      showToast('Job created! AI is screening candidates in the background...');
    } catch (err) {
      showToast('Failed to create job: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateJob = async (data) => {
    if (!selectedJob) return;
    try {
      const res = await jobsApi.update(selectedJob.id, data);
      setJobs(prev => prev.map(j => j.id === selectedJob.id ? res.data : j));
      setShowEditModal(false);
      setSelectedJob(null);
      showToast('Job updated successfully');
    } catch (err) {
      showToast('Failed to update job: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const handleDeleteJob = async (job) => {
    if (!confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      await jobsApi.delete(job.id);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      showToast('Job deleted');
    } catch (err) {
      showToast('Failed to delete job: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const handleViewMatches = async (job) => {
    setSelectedJob(job);
    setShowDetailModal(true);
    setLoadingMatches(true);
    try {
      const res = await jobsApi.getMatches(job.id);
      setJobMatches(res.data);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setJobMatches({ matches: [] });
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleRescreen = async (job) => {
    try {
      await jobsApi.rescreen(job.id);
      showToast(`Re-screening started for "${job.title}"!`);
      setTimeout(() => {
        if (selectedJob?.id === job.id) {
          handleViewMatches(job);
        }
      }, 3000);
    } catch {
      showToast('Failed to start re-screening', 'error');
    }
  };

  const handleShortlist = async (matchId, status) => {
    setShortlistingId(matchId);
    try {
      await resumeApi.updateShortlistStatus(matchId, status);
      setJobMatches(prev => ({
        ...prev,
        matches: prev.matches.map(m =>
          m.match_id === matchId ? { ...m, status } : m
        ),
      }));
      showToast(`Candidate ${status === 'shortlisted' ? 'shortlisted' : 'rejected'}`);
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setShortlistingId(null);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedJob(null);
    setJobMatches(null);
    setFilterStatus('all');
  };

  const openEditModal = (job) => {
    setSelectedJob(job);
    setShowEditModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}
    >
      <div className="flex-between">
        <div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Job Postings</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your active requisitions. Candidates are auto-screened when jobs are created.</p>
        </div>
        <button className="btn-sarvam flex-center gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> New Job
        </button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <Loader2 size={32} className="spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="sovereign-card" style={{ textAlign: 'center', padding: '60px' }}>
          <Briefcase size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>No Jobs Yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Create your first job posting to start sourcing candidates.</p>
          <button className="btn-sarvam" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Create Job
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {jobs.map((job) => (
            <div key={job.id} className="sovereign-card">
              <div className="flex-between">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span className="chip chip-navy">{job.department || 'General'}</span>
                    <span className="chip chip-green">{job.status}</span>
                    {job.location && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{job.location}</span>}
                  </div>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{job.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    {job.experience_min_years}-{job.experience_max_years || '+'} years experience
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {job.skills_required?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '150px', marginRight: '8px' }}>
                      {job.skills_required.slice(0, 2).map((skill, i) => (
                        <span key={i} className="chip chip-blue" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>{skill}</span>
                      ))}
                      {job.skills_required.length > 2 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{job.skills_required.length - 2}</span>
                      )}
                    </div>
                  )}
                  <button className="btn-pill" style={{ padding: '8px' }} onClick={() => openEditModal(job)} title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button className="btn-pill" style={{ padding: '8px' }} onClick={() => handleDeleteJob(job)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                  <button className="btn-sarvam" style={{ padding: '10px 16px', fontSize: '0.85rem' }} onClick={() => handleViewMatches(job)}>
                    <Eye size={16} /> View Matches
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Job Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Job" size="lg">
        <JobForm onSubmit={handleCreateJob} loading={creating} />
      </Modal>

      {/* Edit Job Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedJob(null); }} title="Edit Job" size="lg">
        {selectedJob && (
          <JobForm
            onSubmit={handleUpdateJob}
            loading={false}
            initialData={{
              title: selectedJob.title,
              description: selectedJob.description,
              requirements: selectedJob.requirements,
              department: selectedJob.department || '',
              location: selectedJob.location || '',
              employment_type: selectedJob.employment_type || 'Permanent',
              experience_min_years: selectedJob.experience_min_years || 0,
              experience_max_years: selectedJob.experience_max_years || 5,
              skills_required: selectedJob.skills_required?.join(', ') || '',
              skills_preferred: selectedJob.skills_preferred?.join(', ') || '',
              salary_min: selectedJob.salary_min || '',
              salary_max: selectedJob.salary_max || '',
            }}
            buttonText="Update Job"
          />
        )}
      </Modal>

      {/* Job Matches Modal */}
      <Modal isOpen={showDetailModal} onClose={closeDetailModal} title={selectedJob ? `Matches for: ${selectedJob.title}` : ''} size="xl">
        {loadingMatches ? (
          <div className="flex-center" style={{ padding: '60px' }}>
            <Loader2 size={32} className="spin" />
          </div>
        ) : jobMatches?.matches?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Users size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
            <h3 style={{ marginBottom: '8px' }}>No Matches Yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Screening is in progress or no candidates match this job.
            </p>
            <button className="btn-pill" onClick={() => handleRescreen(selectedJob)}>
              <RefreshCw size={16} /> Re-screen Candidates
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Filter:</span>
                {['all', 'shortlisted', 'pending', 'rejected'].map(status => (
                  <button
                    key={status}
                    className="btn-pill"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      background: filterStatus === status ? 'var(--brand-navy)' : 'transparent',
                      color: filterStatus === status ? 'white' : 'var(--text-secondary)',
                    }}
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    {status !== 'all' && ` (${jobMatches?.matches?.filter(m => m.status === status).length || 0})`}
                  </button>
                ))}
              </div>
              <button className="btn-pill" onClick={() => handleRescreen(selectedJob)}>
                <RefreshCw size={16} /> Re-screen
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
              Showing {filterStatus === 'all' ? jobMatches?.total_matches : jobMatches?.matches?.filter(m => m.status === filterStatus).length} candidates
            </p>
            {jobMatches?.matches?.filter(m => filterStatus === 'all' || m.status === filterStatus).map((match, i) => (
              <div
                key={match.match_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: match.status === 'shortlisted' ? '#E4F5E9' : match.status === 'rejected' ? '#FEE2E2' : i === 0 ? '#E8EEF8' : '#FAFAFA',
                  borderRadius: '16px',
                  border: match.status === 'shortlisted' ? '2px solid #287A4F' : match.status === 'rejected' ? '2px solid #DC2626' : '1px solid var(--border-light)',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--brand-navy)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  flexShrink: 0,
                }}>
                  {match.candidate_name?.charAt(0) || '?'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{match.candidate_name}</h4>
                    {match.status === 'shortlisted' && <span className="chip chip-green" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Shortlisted</span>}
                    {match.status === 'rejected' && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#FEE2E2', color: '#DC2626', borderRadius: '9999px' }}>Rejected</span>}
                    {i === 0 && match.status === 'pending' && <span className="chip chip-blue" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Top Match</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{match.candidate_email}</p>
                  {match.analysis && (
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{match.analysis}</p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ textAlign: 'center', padding: '8px 16px', background: 'white', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: match.overall_score >= 80 ? '#287A4F' : match.overall_score >= 60 ? '#2F5C8F' : 'var(--text-primary)' }}>
                      {Math.round(match.overall_score)}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Score</p>
                  </div>

                  {match.status === 'pending' && (
                    <>
                      <button
                        className="btn-pill"
                        style={{ padding: '8px', background: '#E4F5E9', borderColor: '#287A4F' }}
                        onClick={() => handleShortlist(match.match_id, 'shortlisted')}
                        disabled={shortlistingId === match.match_id}
                        title="Shortlist"
                      >
                        {shortlistingId === match.match_id ? <Loader2 size={16} className="spin" /> : <ThumbsUp size={16} color="#287A4F" />}
                      </button>
                      <button
                        className="btn-pill"
                        style={{ padding: '8px', background: '#FEE2E2', borderColor: '#DC2626' }}
                        onClick={() => handleShortlist(match.match_id, 'rejected')}
                        disabled={shortlistingId === match.match_id}
                        title="Reject"
                      >
                        <ThumbsDown size={16} color="#DC2626" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

// --- Candidates View ---
function CandidatesView({ showToast }) {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedCandidate, setUploadedCandidate] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateMatches, setCandidateMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingJob, setMatchingJob] = useState(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const [candidatesRes, jobsRes] = await Promise.all([
        candidatesApi.list(),
        jobsApi.list(),
      ]);
      setCandidates(candidatesRes.data);
      setJobs(jobsRes.data);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const res = await resumeApi.upload(file);
      setUploadedCandidate(res.data);
      setCandidates(prev => [res.data, ...prev.filter(c => c.id !== res.data.id)]);
      showToast('Resume uploaded and analyzed!');
    } catch (err) {
      showToast('Failed to upload resume: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleViewCandidate = async (candidate) => {
    setSelectedCandidate(candidate);
    setShowDetailModal(true);
    setLoadingMatches(true);
    try {
      const res = await candidatesApi.getMatches(candidate.id);
      setCandidateMatches(res.data);
    } catch (err) {
      console.error('Failed to fetch candidate matches:', err);
      setCandidateMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleDeleteCandidate = async (candidate) => {
    if (!confirm(`Delete "${candidate.name}"? This cannot be undone.`)) return;
    try {
      await candidatesApi.delete(candidate.id);
      setCandidates(prev => prev.filter(c => c.id !== candidate.id));
      showToast('Candidate deleted');
    } catch {
      showToast('Failed to delete candidate', 'error');
    }
  };

  const handleMatchToJob = async (candidateId, jobId) => {
    setMatchingJob(jobId);
    try {
      const res = await resumeApi.matchToJob(candidateId, jobId);
      showToast(`Match score: ${Math.round(res.data.overall_score)}%`);
      // Refresh matches
      const matchesRes = await candidatesApi.getMatches(candidateId);
      setCandidateMatches(matchesRes.data);
    } catch {
      showToast('Failed to calculate match', 'error');
    } finally {
      setMatchingJob(null);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedCandidate(null);
    setCandidateMatches([]);
  };

  const filteredCandidates = candidates.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}
    >
      <div className="flex-between">
        <div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Candidates</h2>
          <p style={{ color: 'var(--text-secondary)' }}>All sourced and uploaded candidates.</p>
        </div>
        <button className="btn-sarvam flex-center gap-2" onClick={() => setShowUploadModal(true)}>
          <Upload size={16} /> Upload Resume
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-elegant"
          style={{ flex: 1 }}
        />
        <button className="btn-pill" onClick={fetchCandidates}>
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <Loader2 size={32} className="spin" />
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="sovereign-card" style={{ textAlign: 'center', padding: '60px' }}>
          <Users size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>No Candidates Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {searchTerm ? 'Try a different search term.' : 'Upload resumes or search GitHub to add candidates.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onView={() => handleViewCandidate(candidate)}
              onDelete={() => handleDeleteCandidate(candidate)}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => { setShowUploadModal(false); setUploadedCandidate(null); }}
        title={uploadedCandidate ? 'Candidate Imported' : 'Upload Resume'}
      >
        {uploadedCandidate ? (
          <CandidateResult candidate={uploadedCandidate} onClose={() => { setShowUploadModal(false); setUploadedCandidate(null); }} />
        ) : (
          <ResumeUpload onUpload={handleUpload} loading={uploading} />
        )}
      </Modal>

      {/* Candidate Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={closeDetailModal} title={selectedCandidate ? `Candidate: ${selectedCandidate.name}` : ''} size="lg">
        {selectedCandidate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Profile Info */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: selectedCandidate.source === 'github' ? '#24292e' : 'var(--brand-navy)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}>
                {selectedCandidate.source === 'github' ? <GithubIcon size={28} /> : selectedCandidate.name?.charAt(0) || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px' }}>{selectedCandidate.name}</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{selectedCandidate.email}</p>
                {selectedCandidate.location && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {selectedCandidate.location}
                  </p>
                )}
              </div>
              <span className="chip chip-blue">{selectedCandidate.source}</span>
            </div>

            {/* Skills */}
            {selectedCandidate.parsed_data?.skills?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Skills</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedCandidate.parsed_data.skills.slice(0, 15).map((skill, i) => (
                    <span key={i} className="chip chip-navy" style={{ fontSize: '0.8rem' }}>{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Match to Job */}
            {jobs.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Match to Job</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {jobs.map(job => (
                    <button
                      key={job.id}
                      className="btn-pill"
                      style={{ fontSize: '0.85rem' }}
                      onClick={() => handleMatchToJob(selectedCandidate.id, job.id)}
                      disabled={matchingJob === job.id}
                    >
                      {matchingJob === job.id ? <Loader2 size={14} className="spin" /> : null}
                      {job.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Job Matches */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Job Matches</h4>
              {loadingMatches ? (
                <div className="flex-center" style={{ padding: '24px' }}>
                  <Loader2 size={24} className="spin" />
                </div>
              ) : candidateMatches.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No job matches yet. Click a job above to calculate match.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {candidateMatches.map(match => {
                  const matchedJob = jobs.find(j => j.id === match.job_id);
                  return (
                    <div key={match.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#FAFAFA', borderRadius: '12px' }}>
                      <span style={{ fontWeight: 500 }}>{matchedJob?.title || `Job #${match.job_id}`}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`chip ${match.overall_score >= 80 ? 'chip-green' : match.overall_score >= 60 ? 'chip-blue' : 'chip-navy'}`}>
                          {Math.round(match.overall_score)}% match
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{match.status}</span>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

function CandidateCard({ candidate, onView, onDelete }) {
  const parsed = candidate.parsed_data || {};

  return (
    <div className="sovereign-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: candidate.source === 'github' ? '#24292e' : 'var(--brand-navy)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.3rem',
          flexShrink: 0,
        }}>
          {candidate.source === 'github' ? <GithubIcon size={24} /> : candidate.name?.charAt(0) || '?'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{candidate.name}</h4>
            <span className="chip chip-blue" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{candidate.source}</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            {candidate.email && (
              <a href={`mailto:${candidate.email}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit' }}>
                <Mail size={14} /> {candidate.email}
              </a>
            )}
            {(parsed.location || candidate.location) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> {parsed.location || candidate.location}
              </span>
            )}
          </div>

          {parsed.skills?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {parsed.skills.slice(0, 6).map((skill, i) => (
                <span key={i} className="chip chip-navy" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{skill}</span>
              ))}
              {parsed.skills.length > 6 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{parsed.skills.length - 6} more</span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button className="btn-pill" style={{ padding: '8px' }} onClick={onView} title="View Details">
            <Eye size={16} />
          </button>
          <button className="btn-pill" style={{ padding: '8px' }} onClick={onDelete} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- GitHub View ---
function GitHubView({ showToast }) {
  const [results, setResults] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [searched, setSearched] = useState(false);
  const [rateLimit, setRateLimit] = useState(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzeUsername, setAnalyzeUsername] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedProfile, setAnalyzedProfile] = useState(null);

  useEffect(() => {
    jobsApi.list().then(res => setJobs(res.data)).catch(console.error);
    // Check rate limit
    githubApi.checkRateLimit().then(res => setRateLimit(res.data)).catch(console.error);
  }, []);

  const handleSearch = async (params) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await githubApi.search(params);
      setResults(res.data.candidates || []);
      showToast(`Found ${res.data.total || 0} developers`);
    } catch (err) {
      showToast('Search failed: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (username) => {
    setImporting(username);
    try {
      await githubApi.import(username);
      showToast(`Imported ${username} as candidate!`);
    } catch (err) {
      showToast('Import failed: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setImporting(null);
    }
  };

  const handleAnalyze = async () => {
    if (!analyzeUsername.trim()) return;
    setAnalyzing(true);
    try {
      const res = await githubApi.analyze(analyzeUsername.trim());
      setAnalyzedProfile(res.data);
    } catch (err) {
      showToast('Analysis failed: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const closeAnalyzeModal = () => {
    setShowAnalyzeModal(false);
    setAnalyzeUsername('');
    setAnalyzedProfile(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}
    >
      <div className="flex-between">
        <div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            <GithubIcon size={32} style={{ verticalAlign: 'middle', marginRight: '12px' }} />
            GitHub Sourcing
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Search and analyze developer profiles from GitHub.</p>
        </div>
        <button className="btn-pill" onClick={() => setShowAnalyzeModal(true)}>
          <Search size={16} /> Analyze Profile
        </button>
      </div>

      {/* Rate Limit Info */}
      {rateLimit && (
        <div style={{ display: 'flex', gap: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>API Rate Limit: {rateLimit.resources?.core?.remaining || 0} / {rateLimit.resources?.core?.limit || 60} remaining</span>
          <span>Search: {rateLimit.resources?.search?.remaining || 0} / {rateLimit.resources?.search?.limit || 10} remaining</span>
        </div>
      )}

      <div className="sovereign-card">
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Search Developers</h3>
        <GitHubSearchForm onSearch={handleSearch} loading={loading} jobs={jobs} />
      </div>

      {loading && (
        <div className="flex-center" style={{ padding: '60px' }}>
          <Loader2 size={32} className="spin" />
          <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>Searching and analyzing profiles...</span>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="sovereign-card" style={{ textAlign: 'center', padding: '60px' }}>
          <Search size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>No Results Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search criteria.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '16px' }}>{results.length} Developers Found</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {results.map((candidate, i) => (
              <GitHubCandidateCard
                key={candidate.source_id || i}
                candidate={candidate}
                onImport={handleImport}
                importing={importing === candidate.source_id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Analyze Profile Modal */}
      <Modal isOpen={showAnalyzeModal} onClose={closeAnalyzeModal} title="Analyze GitHub Profile" size="lg">
        {!analyzedProfile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Enter a GitHub username to get a detailed AI analysis of their profile.
            </p>
            <input
              type="text"
              placeholder="e.g., torvalds"
              value={analyzeUsername}
              onChange={(e) => setAnalyzeUsername(e.target.value)}
              className="input-elegant"
              style={{ borderRadius: '12px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button className="btn-sarvam" onClick={handleAnalyze} disabled={analyzing || !analyzeUsername.trim()}>
              {analyzing ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
              {analyzing ? 'Analyzing...' : 'Analyze Profile'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Profile Header */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <img
                src={analyzedProfile.profile?.avatar_url}
                alt={analyzedProfile.profile?.name}
                style={{ width: '64px', height: '64px', borderRadius: '50%' }}
              />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{analyzedProfile.profile?.name || analyzedProfile.profile?.username}</h3>
                <p style={{ margin: '4px 0', color: 'var(--text-muted)' }}>@{analyzedProfile.profile?.username}</p>
                {analyzedProfile.profile?.bio && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>{analyzedProfile.profile?.bio}</p>
                )}
              </div>
              {analyzedProfile.ai_assessment?.overall_score && (
                <div style={{ textAlign: 'center', padding: '12px 20px', background: '#E8EEF8', borderRadius: '12px' }}>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 600, color: 'var(--brand-navy)' }}>
                    {analyzedProfile.ai_assessment.overall_score}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Score</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'Repos', value: analyzedProfile.profile?.public_repos },
                { label: 'Followers', value: analyzedProfile.profile?.followers },
                { label: 'Stars', value: analyzedProfile.profile?.total_stars },
                { label: 'Level', value: analyzedProfile.ai_assessment?.experience_level },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '12px', background: '#FAFAFA', borderRadius: '12px' }}>
                  <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{stat.value || '-'}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* AI Assessment */}
            {analyzedProfile.ai_assessment?.summary && (
              <div style={{ background: '#F4F4F4', padding: '16px', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontStyle: 'italic' }}>{analyzedProfile.ai_assessment.summary}</p>
              </div>
            )}

            {/* Skills */}
            {analyzedProfile.ai_assessment?.skills_detected?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Detected Skills</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {analyzedProfile.ai_assessment.skills_detected.map((skill, i) => (
                    <span key={i} className="chip chip-navy" style={{ fontSize: '0.8rem' }}>{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <a href={analyzedProfile.profile?.profile_url} target="_blank" rel="noopener noreferrer" className="btn-pill" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                <GithubIcon size={16} /> View on GitHub
              </a>
              {analyzedProfile.profile?.linkedin_url && (
                <a href={analyzedProfile.profile?.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-pill" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                  <LinkedinIcon size={16} /> LinkedIn
                </a>
              )}
              <button className="btn-sarvam" style={{ flex: 1 }} onClick={() => { handleImport(analyzedProfile.profile?.username); closeAnalyzeModal(); }}>
                Import as Candidate
              </button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

export default App;
