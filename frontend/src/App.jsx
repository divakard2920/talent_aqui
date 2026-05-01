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
  ChevronDown,
  Phone,
  Calendar,
  ClipboardList,
  QrCode,
  Play,
  Trophy,
  UserCheck,
  UserX,
  Clock,
  Download,
} from 'lucide-react';
import './index.css';
import knorrLogo from './assets/knorr.png';
import { jobsApi, candidatesApi, resumeApi, githubApi, interviewApi, walkinApi } from './services/api';
import { Modal, JobForm, GitHubSearchForm, GitHubCandidateCard, ResumeUpload, CandidateResult, ConfirmDialog, InterviewRoom } from './components';

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
  const [viewCandidateId, setViewCandidateId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleViewCandidate = (candidateId) => {
    setViewCandidateId(candidateId);
    setActiveTab('candidates');
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check for candidate test mode via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const testDriveId = urlParams.get('test');
  const interviewId = urlParams.get('interview');

  // If in test mode, show candidate test portal
  if (testDriveId) {
    return <CandidateTestPortal driveId={parseInt(testDriveId)} />;
  }

  // If in interview mode, show interview portal
  if (interviewId) {
    return <InterviewPortal interviewId={parseInt(interviewId)} />;
  }

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
            {['dashboard', 'jobs', 'candidates', 'interviews', 'walk-ins', 'github'].map((tab) => (
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
                {tab === 'walk-ins' ? 'Walk-ins' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{ paddingTop: '140px', paddingBottom: '80px' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <DashboardView key="dashboard" onNavigate={setActiveTab} />}
          {activeTab === 'jobs' && <JobsView key="jobs" showToast={showToast} onViewCandidate={handleViewCandidate} />}
          {activeTab === 'candidates' && <CandidatesView key="candidates" showToast={showToast} viewCandidateId={viewCandidateId} clearViewCandidateId={() => setViewCandidateId(null)} />}
          {activeTab === 'interviews' && <InterviewsView key="interviews" showToast={showToast} />}
          {activeTab === 'walk-ins' && <WalkInsView key="walk-ins" showToast={showToast} />}
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
  const [stats, setStats] = useState({ jobs: 0, candidates: 0, avgScore: null });
  const [topCandidates, setTopCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          jobsApi.list(),
          candidatesApi.list(),  // Get all candidates for accurate count
        ]);

        // Calculate average match score from all jobs
        let allScores = [];
        for (const job of jobsRes.data.slice(0, 5)) { // Check first 5 jobs max
          try {
            const matchesRes = await jobsApi.getMatches(job.id);
            if (matchesRes.data?.matches) {
              allScores.push(...matchesRes.data.matches.map(m => m.overall_score));
            }
          } catch {
            // Skip if no matches
          }
        }

        const avgScore = allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : null;

        setStats({
          jobs: jobsRes.data.length,
          candidates: candidatesRes.data.length,  // Now shows actual total
          avgScore,
        });
        setTopCandidates(candidatesRes.data.slice(0, 3));  // Display only top 3
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
          { label: 'Avg Match Score', value: loading ? '-' : (stats.avgScore !== null ? `${stats.avgScore}%` : 'N/A'), icon: <TrendingUp size={20} color="var(--text-secondary)" /> }
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
                    {formatName(candidate.name)?.charAt(0) || '?'}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{formatName(candidate.name)}</h4>
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
function JobsView({ showToast, onViewCandidate }) {
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
  const [screeningJobId, setScreeningJobId] = useState(null); // Track job being screened
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null });

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
      setScreeningJobId(res.data.id);
      showToast('Job created! AI is screening candidates in the background...', 'info');
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

  const handleDeleteJob = (job) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Delete Job',
      message: `Are you sure you want to delete "${job.title}"? This will also remove all candidate matches for this job. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await jobsApi.delete(job.id);
          setJobs(prev => prev.filter(j => j.id !== job.id));
          showToast('Job deleted');
        } catch (err) {
          showToast('Failed to delete job: ' + (err.response?.data?.detail || err.message), 'error');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleViewMatches = async (job) => {
    setSelectedJob(job);
    setShowDetailModal(true);
    setLoadingMatches(true);
    try {
      const res = await jobsApi.getMatches(job.id);
      setJobMatches(res.data);
      // Clear screening indicator only when we have matches
      if (res.data?.matches?.length > 0 && screeningJobId === job.id) {
        setScreeningJobId(null);
      }
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setJobMatches({ matches: [] });
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleRescreen = (job) => {
    setConfirmDialog({
      isOpen: true,
      type: 'info',
      title: 'Re-screen Candidates',
      message: `Do you want to re-screen candidates for "${job.title}"? This will re-evaluate only pending candidates. Shortlisted and rejected candidates will be skipped.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await jobsApi.rescreen(job.id);
          setScreeningJobId(job.id);
          // Clear current matches to show screening progress state in modal
          setJobMatches({ matches: [], total_matches: 0 });
          showToast(`Re-screening started for "${job.title}"!`, 'info');
        } catch {
          showToast('Failed to start re-screening', 'error');
        }
      },
    });
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

  const downloadScreeningCSV = () => {
    if (!jobMatches?.matches || !selectedJob) return;

    const headers = ['Rank', 'Name', 'Email', 'Overall Score', 'Skills Score', 'Experience Score', 'Education Score', 'Status', 'Analysis'];
    const rows = jobMatches.matches.map((match, i) => [
      i + 1,
      match.candidate_name || '',
      match.candidate_email || '',
      Math.round(match.overall_score || 0),
      Math.round(match.skills_score || 0),
      Math.round(match.experience_score || 0),
      Math.round(match.education_score || 0),
      match.status || 'pending',
      `"${(match.analysis || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedJob.title.replace(/\s+/g, '_')}_screening_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded!');
  };

  const downloadScreeningPDF = () => {
    if (!jobMatches?.matches || !selectedJob) return;

    // Create printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Screening Results - ${selectedJob.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1E3A5F; margin-bottom: 8px; }
          .subtitle { color: #666; margin-bottom: 24px; }
          .summary { display: flex; gap: 32px; margin-bottom: 32px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 28px; font-weight: bold; color: #1E3A5F; }
          .summary-label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1E3A5F; color: white; padding: 12px 8px; text-align: left; font-size: 12px; }
          td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .score { font-weight: bold; }
          .score-high { color: #287A4F; }
          .score-mid { color: #2F5C8F; }
          .score-low { color: #666; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .status-shortlisted { background: #E4F5E9; color: #287A4F; }
          .status-rejected { background: #FEE2E2; color: #DC2626; }
          .status-pending { background: #F4F4F4; color: #666; }
          .footer { margin-top: 32px; text-align: center; color: #999; font-size: 11px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Screening Results</h1>
        <p class="subtitle">${selectedJob.title} • ${selectedJob.department || ''} • ${selectedJob.location || 'Remote'}</p>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-value">${jobMatches.total_matches || 0}</div>
            <div class="summary-label">Total Candidates</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${jobMatches.matches.filter(m => m.status === 'shortlisted').length}</div>
            <div class="summary-label">Shortlisted</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${jobMatches.matches.filter(m => m.status === 'pending').length}</div>
            <div class="summary-label">Pending</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${jobMatches.matches.filter(m => m.status === 'rejected').length}</div>
            <div class="summary-label">Rejected</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Candidate</th>
              <th>Overall</th>
              <th>Skills</th>
              <th>Experience</th>
              <th>Education</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${jobMatches.matches.map((match, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>
                  <strong>${match.candidate_name || 'Unknown'}</strong><br/>
                  <span style="color: #666; font-size: 10px;">${match.candidate_email || ''}</span>
                </td>
                <td class="score ${match.overall_score >= 80 ? 'score-high' : match.overall_score >= 60 ? 'score-mid' : 'score-low'}">${Math.round(match.overall_score || 0)}%</td>
                <td>${Math.round(match.skills_score || 0)}%</td>
                <td>${Math.round(match.experience_score || 0)}%</td>
                <td>${Math.round(match.education_score || 0)}%</td>
                <td><span class="status status-${match.status || 'pending'}">${(match.status || 'pending').toUpperCase()}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
    showToast('PDF ready for download!');
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
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: job.status === 'open' ? '#E4F5E9' : job.status === 'on_hold' ? '#FEF3C7' : '#FEE2E2',
                        color: job.status === 'open' ? '#287A4F' : job.status === 'on_hold' ? '#92400E' : '#DC2626',
                      }}
                    >
                      {job.status === 'open' ? 'Open' : job.status === 'on_hold' ? 'On Hold' : 'Closed'}
                    </span>
                    {screeningJobId === job.id && (
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: '#E0E7FF',
                          color: '#4338CA',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Loader2 size={12} className="spin" /> Screening candidates...
                      </span>
                    )}
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
              status: selectedJob.status || 'open',
            }}
            buttonText="Update Job"
          />
        )}
      </Modal>

      {/* Job Matches Modal */}
      <Modal isOpen={showDetailModal} onClose={closeDetailModal} title="" size="xl">
        {loadingMatches ? (
          <div className="flex-center" style={{ padding: '60px' }}>
            <Loader2 size={32} className="spin" />
          </div>
        ) : jobMatches?.matches?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            {screeningJobId === selectedJob?.id ? (
              <>
                <Loader2 size={56} className="spin" color="var(--brand-navy)" style={{ marginBottom: '20px' }} />
                <h3 style={{ marginBottom: '8px', fontSize: '1.3rem' }}>Screening in Progress</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '350px', margin: '0 auto 24px' }}>
                  AI is analyzing candidates against this job's requirements. This may take a minute.
                </p>
                <button className="btn-sarvam" onClick={() => handleViewMatches(selectedJob)}>
                  <RefreshCw size={16} /> Check for Results
                </button>
              </>
            ) : (
              <>
                <Users size={56} color="var(--text-muted)" style={{ marginBottom: '20px' }} />
                <h3 style={{ marginBottom: '8px', fontSize: '1.3rem' }}>No Matches Yet</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px' }}>
                  No candidates have been matched to this job yet. Run screening to find matches.
                </p>
                <button className="btn-sarvam" onClick={() => handleRescreen(selectedJob)}>
                  <RefreshCw size={16} /> Run Screening
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, var(--brand-navy) 0%, #4A7AB8 100%)', padding: '24px', borderRadius: '16px', color: 'white' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem' }}>{selectedJob?.title}</h2>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>{selectedJob?.department} • {selectedJob?.location || 'Remote'}</p>
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{jobMatches?.total_matches}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Total Matches</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{jobMatches?.matches?.filter(m => m.status === 'shortlisted').length || 0}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Shortlisted</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{jobMatches?.matches?.filter(m => m.status === 'pending').length || 0}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Pending Review</p>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', background: '#F4F4F4', borderRadius: '12px', padding: '4px' }}>
                {['all', 'pending', 'shortlisted', 'rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: filterStatus === status ? 'white' : 'transparent',
                      boxShadow: filterStatus === status ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: filterStatus === status ? 600 : 400,
                      color: filterStatus === status ? 'var(--brand-navy)' : 'var(--text-muted)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-pill" onClick={downloadScreeningCSV} title="Download as CSV">
                  <Download size={14} /> CSV
                </button>
                <button className="btn-pill" onClick={downloadScreeningPDF} title="Download as PDF">
                  <Download size={14} /> PDF
                </button>
                <button className="btn-pill" onClick={() => handleRescreen(selectedJob)}>
                  <RefreshCw size={14} /> Re-screen
                </button>
              </div>
            </div>

            {/* Candidate Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {jobMatches?.matches?.filter(m => filterStatus === 'all' || m.status === filterStatus).map((match, i) => (
                <div
                  key={match.match_id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid var(--border-light)',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{
                    height: '4px',
                    background: match.status === 'shortlisted' ? '#287A4F' : match.status === 'rejected' ? '#DC2626' : match.overall_score >= 80 ? '#287A4F' : match.overall_score >= 60 ? '#2F5C8F' : '#E5E5E5',
                  }} />

                  <div style={{ padding: '20px', display: 'flex', gap: '20px' }}>
                    {/* Left: Avatar & Score */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: match.source === 'github' ? '#24292e' : 'linear-gradient(135deg, var(--brand-navy) 0%, #4A7AB8 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                        fontWeight: 500,
                      }}>
                        {match.source === 'github' ? <GithubIcon size={24} /> : formatName(match.candidate_name)?.charAt(0) || '?'}
                      </div>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: match.overall_score >= 80 ? '#E4F5E9' : match.overall_score >= 60 ? '#E8EEF8' : '#F4F4F4',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 700, color: match.overall_score >= 80 ? '#287A4F' : match.overall_score >= 60 ? '#2F5C8F' : 'var(--text-primary)' }}>
                          {Math.round(match.overall_score)}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SCORE</span>
                      </div>
                    </div>

                    {/* Middle: Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{formatName(match.candidate_name)}</h4>
                        {match.status === 'shortlisted' && <span style={{ background: '#E4F5E9', color: '#287A4F', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Shortlisted</span>}
                        {match.status === 'rejected' && <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Rejected</span>}
                        {i === 0 && filterStatus === 'all' && match.status === 'pending' && <span style={{ background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Top Match</span>}
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {/* Contact Icons */}
                        {match.candidate_email && (
                          <a
                            href={`mailto:${match.candidate_email}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}
                            title={`Email ${formatName(match.candidate_name)}`}
                          >
                            <Mail size={14} /> {match.candidate_email}
                          </a>
                        )}
                        {match.candidate_location && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <MapPin size={14} /> {match.candidate_location}
                          </span>
                        )}
                        {match.parsed_data?.github_profile?.profile_url && (
                          <a
                            href={match.parsed_data.github_profile.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#24292e', textDecoration: 'none', fontSize: '0.85rem' }}
                            title="GitHub Profile"
                          >
                            <GithubIcon size={14} />
                          </a>
                        )}
                        {match.parsed_data?.linkedin_url && (
                          <a
                            href={match.parsed_data.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0A66C2', textDecoration: 'none', fontSize: '0.85rem' }}
                            title="LinkedIn Profile"
                          >
                            <LinkedinIcon size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => onViewCandidate(match.candidate_id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--brand-navy)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            padding: 0,
                          }}
                        >
                          <Eye size={14} /> View Profile
                        </button>
                      </div>

                      {/* Score Breakdown */}
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                        {[
                          { label: 'Skills', score: match.skills_score },
                          { label: 'Experience', score: match.experience_score },
                          { label: 'Education', score: match.education_score },
                        ].map(item => item.score != null && (
                          <div key={item.label} style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                              <span style={{ fontWeight: 600 }}>{Math.round(item.score)}</span>
                            </div>
                            <div style={{ height: '4px', background: '#E5E5E5', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${item.score}%`, height: '100%', background: item.score >= 80 ? '#287A4F' : item.score >= 60 ? '#2F5C8F' : '#9CA3AF', borderRadius: '2px' }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {match.analysis && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{match.analysis}</p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                      {match.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleShortlist(match.match_id, 'shortlisted')}
                            disabled={shortlistingId === match.match_id}
                            style={{
                              padding: '10px 20px',
                              borderRadius: '10px',
                              border: 'none',
                              background: '#287A4F',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              justifyContent: 'center',
                            }}
                          >
                            {shortlistingId === match.match_id ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                            Shortlist
                          </button>
                          <button
                            onClick={() => handleShortlist(match.match_id, 'rejected')}
                            disabled={shortlistingId === match.match_id}
                            style={{
                              padding: '10px 20px',
                              borderRadius: '10px',
                              border: '1px solid #E5E5E5',
                              background: 'white',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              justifyContent: 'center',
                            }}
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleShortlist(match.match_id, 'pending')}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: '1px solid #E5E5E5',
                            background: 'white',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.type === 'danger' ? 'Delete' : 'Confirm'}
      />
    </motion.div>
  );
}

// --- Candidates View ---
function CandidatesView({ showToast, viewCandidateId, clearViewCandidateId }) {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateMatches, setCandidateMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingJob, setMatchingJob] = useState(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null });
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [currentInterview, setCurrentInterview] = useState(null);
  const [interviewJob, setInterviewJob] = useState(null);
  const [creatingInterview, setCreatingInterview] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const [candidatesRes, jobsRes] = await Promise.all([
        candidatesApi.list(),
        jobsApi.list(),
      ]);
      setCandidates(candidatesRes.data);
      setJobs(jobsRes.data);
      return candidatesRes.data;
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Handle navigation from job matches screen
  useEffect(() => {
    if (viewCandidateId && candidates.length > 0) {
      const candidate = candidates.find(c => c.id === viewCandidateId);
      if (candidate) {
        setSelectedCandidate(candidate);
        setShowDetailModal(true);
        // Load matches
        candidatesApi.getMatches(viewCandidateId).then(res => {
          setCandidateMatches(res.data);
        }).catch(console.error);
      }
      clearViewCandidateId?.();
    }
  }, [viewCandidateId, candidates, clearViewCandidateId]);

  const handleUpload = async (file) => {
    const res = await resumeApi.upload(file);
    setCandidates(prev => [res.data, ...prev.filter(c => c.id !== res.data.id)]);
    return res.data;
  };

  const handleViewCandidate = async (candidate) => {
    setSelectedCandidate(candidate);
    setShowDetailModal(true);
    setShowAllSkills(false);
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

  const handleDeleteCandidate = (candidate) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Delete Candidate',
      message: `Are you sure you want to delete "${formatName(candidate.name)}"? This will also remove all job matches for this candidate. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await candidatesApi.delete(candidate.id);
          setCandidates(prev => prev.filter(c => c.id !== candidate.id));
          showToast('Candidate deleted');
        } catch {
          showToast('Failed to delete candidate', 'error');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
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
    setShowAllSkills(false);
  };

  const [interviewCandidate, setInterviewCandidate] = useState(null);

  const handleScheduleInterview = async (candidateId, jobId) => {
    const job = jobs.find(j => j.id === jobId);
    const candidate = candidates.find(c => c.id === candidateId);
    if (!job || !candidate) return;

    setCreatingInterview(true);
    try {
      const res = await interviewApi.create(candidateId, jobId);
      setCurrentInterview(res.data);
      setInterviewJob(job);
      setInterviewCandidate(candidate);
      setShowDetailModal(false);  // Close detail modal but keep candidate data
      setShowInterviewModal(true);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to schedule screening call', 'error');
    } finally {
      setCreatingInterview(false);
    }
  };

  const handleInterviewComplete = (result) => {
    const isIncomplete = result.evaluation?.incomplete || result.evaluation?.overall_score === 0;
    if (isIncomplete) {
      showToast('Screening incomplete - candidate did not engage', 'error');
    } else {
      showToast(`Screening complete! Score: ${result.evaluation?.overall_score || 'N/A'}`, 'success');
    }
  };

  const closeInterviewModal = () => {
    setShowInterviewModal(false);
    setCurrentInterview(null);
    setInterviewJob(null);
    setInterviewCandidate(null);
  };

  const filteredCandidates = candidates.filter(c => {
    const term = searchTerm.toLowerCase();
    const skills = c.parsed_data?.skills || [];
    return (
      c.name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      skills.some(skill => skill.toLowerCase().includes(term))
    );
  });

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
          <Upload size={16} /> Upload Resumes
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          placeholder="Search by name, email, or skill..."
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
        onClose={() => setShowUploadModal(false)}
        title="Upload Resumes"
      >
        <ResumeUpload onUpload={handleUpload} />
      </Modal>

      {/* Candidate Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={closeDetailModal} title={selectedCandidate ? `Candidate: ${formatName(selectedCandidate.name)}` : ''} size="lg">
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
                {selectedCandidate.source === 'github' ? <GithubIcon size={28} /> : formatName(selectedCandidate.name)?.charAt(0) || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px' }}>{formatName(selectedCandidate.name)}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {selectedCandidate.email && (
                    <span><Mail size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{selectedCandidate.email}</span>
                  )}
                  {selectedCandidate.phone && (
                    <span>{selectedCandidate.phone}</span>
                  )}
                  {selectedCandidate.location && (
                    <span><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{selectedCandidate.location}</span>
                  )}
                </div>
              </div>
              <span className="chip chip-blue">{selectedCandidate.source}</span>
            </div>

            {/* Summary */}
            {(selectedCandidate.parsed_data?.summary || selectedCandidate.parsed_data?.bio) && (
              <div style={{ background: '#F4F4F4', padding: '16px', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {selectedCandidate.parsed_data.summary || selectedCandidate.parsed_data.bio}
                </p>
              </div>
            )}

            {/* Work Experience */}
            {selectedCandidate.parsed_data?.experience?.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Experience</h4>
                  {selectedCandidate.parsed_data?.total_years_experience && (
                    <span className="chip chip-navy">{selectedCandidate.parsed_data.total_years_experience} years total</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedCandidate.parsed_data.experience.slice(0, 4).map((exp, i) => (
                    <div key={i} style={{ background: '#FAFAFA', padding: '14px 16px', borderRadius: '12px', borderLeft: '3px solid var(--brand-navy)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500 }}>{exp.title || exp.role || exp}</p>
                          {exp.company && <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{exp.company}</p>}
                        </div>
                        {(exp.start_date || exp.end_date || exp.duration) && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {exp.start_date && exp.end_date
                              ? `${exp.start_date} - ${exp.end_date}`
                              : exp.duration || ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {selectedCandidate.parsed_data?.education?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Education</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedCandidate.parsed_data.education.slice(0, 2).map((edu, i) => (
                    <div key={i} style={{ background: '#E4F5E9', padding: '14px 16px', borderRadius: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 500, color: '#287A4F' }}>
                        {edu.degree || edu}
                      </p>
                      {edu.institution && (
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {edu.institution}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {selectedCandidate.parsed_data?.certifications?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Certifications</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedCandidate.parsed_data.certifications.map((cert, i) => (
                    <span key={i} style={{ background: '#FEF3C7', color: '#92400E', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Assessment */}
            {selectedCandidate.parsed_data?.ai_assessment && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>AI Assessment</h4>
                <div style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                  {/* Score and Level Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    {selectedCandidate.parsed_data.ai_assessment.overall_score && (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        background: selectedCandidate.parsed_data.ai_assessment.overall_score >= 80 ? '#E4F5E9' : selectedCandidate.parsed_data.ai_assessment.overall_score >= 60 ? '#E8EEF8' : '#F4F4F4',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: selectedCandidate.parsed_data.ai_assessment.overall_score >= 80 ? '#287A4F' : selectedCandidate.parsed_data.ai_assessment.overall_score >= 60 ? '#2F5C8F' : 'var(--text-primary)' }}>
                          {selectedCandidate.parsed_data.ai_assessment.overall_score}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>SCORE</span>
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      {selectedCandidate.parsed_data.ai_assessment.summary && (
                        <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          "{selectedCandidate.parsed_data.ai_assessment.summary}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    {selectedCandidate.parsed_data.ai_assessment.experience_level && (
                      <span className="chip chip-blue" style={{ textTransform: 'capitalize' }}>{selectedCandidate.parsed_data.ai_assessment.experience_level}</span>
                    )}
                    {selectedCandidate.parsed_data.ai_assessment.recommendation && (
                      <span className={`chip ${selectedCandidate.parsed_data.ai_assessment.recommendation === 'highly_recommended' ? 'chip-green' : 'chip-navy'}`}>
                        {selectedCandidate.parsed_data.ai_assessment.recommendation.replace(/_/g, ' ')}
                      </span>
                    )}
                    {selectedCandidate.parsed_data.ai_assessment.career_trajectory && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {selectedCandidate.parsed_data.ai_assessment.career_trajectory}
                      </span>
                    )}
                  </div>

                  {/* Strengths & Areas for Growth */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {selectedCandidate.parsed_data.ai_assessment.strengths?.length > 0 && (
                      <div>
                        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: '#287A4F' }}>Strengths</p>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {selectedCandidate.parsed_data.ai_assessment.strengths.slice(0, 3).map((s, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedCandidate.parsed_data.ai_assessment.areas_for_growth?.length > 0 && (
                      <div>
                        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: '#92400E' }}>Areas for Growth</p>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {selectedCandidate.parsed_data.ai_assessment.areas_for_growth.slice(0, 2).map((s, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* GitHub Info */}
            {selectedCandidate.source === 'github' && selectedCandidate.parsed_data?.github_profile && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>GitHub</h4>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ background: '#FAFAFA', padding: '12px 16px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{selectedCandidate.parsed_data.github_profile.public_repos || 0}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Repos</p>
                  </div>
                  <div style={{ background: '#FAFAFA', padding: '12px 16px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{selectedCandidate.parsed_data.github_profile.followers || 0}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Followers</p>
                  </div>
                  <div style={{ background: '#FAFAFA', padding: '12px 16px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{selectedCandidate.parsed_data.github_profile.total_stars || 0}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stars</p>
                  </div>
                  {selectedCandidate.parsed_data.github_profile.profile_url && (
                    <a
                      href={selectedCandidate.parsed_data.github_profile.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-pill"
                      style={{ textDecoration: 'none' }}
                    >
                      <GithubIcon size={16} /> View Profile
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Skills */}
            {selectedCandidate.parsed_data?.skills?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Skills</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  {(showAllSkills
                    ? selectedCandidate.parsed_data.skills
                    : selectedCandidate.parsed_data.skills.slice(0, 20)
                  ).map((skill, i) => (
                    <span key={i} className="chip chip-navy" style={{ fontSize: '0.8rem' }}>{skill}</span>
                  ))}
                  {selectedCandidate.parsed_data.skills.length > 20 && !showAllSkills && (
                    <button
                      onClick={() => setShowAllSkills(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.8rem',
                        color: 'var(--brand-navy)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontWeight: 500,
                      }}
                    >
                      +{selectedCandidate.parsed_data.skills.length - 20} more
                    </button>
                  )}
                  {showAllSkills && selectedCandidate.parsed_data.skills.length > 20 && (
                    <button
                      onClick={() => setShowAllSkills(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.8rem',
                        color: 'var(--brand-navy)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontWeight: 500,
                      }}
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Match to Job - only open jobs */}
            {jobs.filter(j => j.status === 'open').length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Match to Job</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {jobs.filter(j => j.status === 'open').map(job => (
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

            {/* Schedule L1 Interview */}
            {jobs.filter(j => j.status === 'open').length > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #E8EEF8 0%, #F0F4F8 100%)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--brand-navy)' }}>Schedule L1 Screening Call</h4>
                <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Connect this candidate with Arun for an initial screening call
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {jobs.filter(j => j.status === 'open').map(job => (
                    <button
                      key={job.id}
                      className="btn-sarvam"
                      style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      onClick={() => handleScheduleInterview(selectedCandidate.id, job.id)}
                      disabled={creatingInterview}
                    >
                      {creatingInterview ? <Loader2 size={14} className="spin" /> : null}
                      Screen for {job.title}
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
                  {candidateMatches
                    .filter(match => jobs.some(j => j.id === match.job_id)) // Filter out deleted jobs
                    .map(match => {
                      const matchedJob = jobs.find(j => j.id === match.job_id);
                      return (
                        <div key={match.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#FAFAFA', borderRadius: '12px' }}>
                          <span style={{ fontWeight: 500 }}>{matchedJob?.title}</span>
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="Delete"
      />

      {/* Interview Modal */}
      <Modal
        isOpen={showInterviewModal}
        onClose={closeInterviewModal}
        title=""
        size="lg"
      >
        {currentInterview && interviewCandidate && (
          <InterviewRoom
            interview={currentInterview}
            candidate={interviewCandidate}
            job={interviewJob}
            onComplete={handleInterviewComplete}
            onClose={closeInterviewModal}
          />
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
          {candidate.source === 'github' ? <GithubIcon size={24} /> : formatName(candidate.name)?.charAt(0) || '?'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{formatName(candidate.name)}</h4>
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

// --- Interviews View ---
function InterviewsView({ showToast }) {
  const [jobs, setJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [expandedInterview, setExpandedInterview] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [jobsRes, interviewsRes, candidatesRes] = await Promise.all([
          jobsApi.list(),
          interviewApi.list(),
          candidatesApi.list(),
        ]);
        setJobs(jobsRes.data);
        setInterviews(interviewsRes.data);
        setCandidates(candidatesRes.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatName = (name) => {
    if (!name) return '';
    return name.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Group interviews by job
  const interviewsByJob = jobs.map(job => ({
    job,
    interviews: interviews.filter(i => i.job_id === job.id),
  })).filter(g => g.interviews.length > 0);

  // Filter by selected job
  const displayGroups = selectedJob
    ? interviewsByJob.filter(g => g.job.id === selectedJob)
    : interviewsByJob;

  // Stats
  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter(i => i.status === 'completed').length;
  const proceedToL2 = interviews.filter(i => i.evaluation?.recommendation === 'proceed_to_l2').length;
  const onHold = interviews.filter(i => i.evaluation?.recommendation === 'hold').length;

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-center" style={{ padding: '80px' }}>
        <Loader2 size={32} className="spin" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Screening Interviews</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          L1 screening calls conducted by Arun
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Screenings', value: totalInterviews, color: 'var(--brand-navy)' },
          { label: 'Completed', value: completedInterviews, color: 'var(--accent-blue)' },
          { label: 'Proceed to L2', value: proceedToL2, color: '#287A4F' },
          { label: 'On Hold', value: onHold, color: '#F59E0B' },
        ].map((stat, i) => (
          <div key={i} className="sovereign-card" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: stat.color, margin: '0 0 4px' }}>{stat.value}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Job Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className={selectedJob === null ? 'btn-sarvam' : 'btn-pill'}
          onClick={() => setSelectedJob(null)}
          style={{ fontSize: '0.85rem', padding: '8px 16px' }}
        >
          All Jobs
        </button>
        {jobs.filter(j => interviews.some(i => i.job_id === j.id)).map(job => (
          <button
            key={job.id}
            className={selectedJob === job.id ? 'btn-sarvam' : 'btn-pill'}
            onClick={() => setSelectedJob(job.id)}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            {job.title} ({interviews.filter(i => i.job_id === job.id).length})
          </button>
        ))}
      </div>

      {/* Interview Results by Job */}
      {displayGroups.length === 0 ? (
        <div className="sovereign-card" style={{ textAlign: 'center', padding: '60px' }}>
          <Phone size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px' }}>No Screening Calls Yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Schedule L1 screenings from candidate profiles to see results here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {displayGroups.map(({ job, interviews: jobInterviews }) => (
            <div key={job.id} className="sovereign-card" style={{ padding: '24px' }}>
              {/* Job Header */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>{job.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {job.department} • {job.location}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="chip chip-green">
                      {jobInterviews.filter(i => i.evaluation?.recommendation === 'proceed_to_l2').length} Proceed
                    </span>
                    <span className="chip chip-blue">
                      {jobInterviews.filter(i => i.evaluation?.recommendation === 'hold').length} Hold
                    </span>
                    <span className="chip chip-navy">
                      {jobInterviews.filter(i => i.evaluation?.recommendation === 'reject' || i.evaluation?.incomplete).length} Reject
                    </span>
                  </div>
                </div>
              </div>

              {/* Candidates Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {jobInterviews.map(interview => {
                  const candidate = candidates.find(c => c.id === interview.candidate_id);
                  const evaluation = interview.evaluation;
                  const isIncomplete = evaluation?.incomplete || evaluation?.overall_score === 0;
                  const isExpanded = expandedInterview === interview.id;

                  return (
                    <div
                      key={interview.id}
                      style={{
                        background: interview.status === 'completed'
                          ? (isIncomplete ? '#FEF2F2' : evaluation?.recommendation === 'proceed_to_l2' ? '#F0FDF4' : evaluation?.recommendation === 'hold' ? '#FFFBEB' : '#FEF2F2')
                          : '#F9FAFB',
                        borderRadius: '12px',
                        border: '1px solid var(--border-light)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Main Row */}
                      <div
                        style={{
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          cursor: interview.status === 'completed' && !isIncomplete ? 'pointer' : 'default',
                        }}
                        onClick={() => interview.status === 'completed' && !isIncomplete && setExpandedInterview(isExpanded ? null : interview.id)}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'var(--brand-navy)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          {formatName(candidate?.name)?.charAt(0) || '?'}
                        </div>

                        {/* Candidate Info */}
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 2px', fontWeight: 600 }}>{formatName(candidate?.name) || 'Unknown'}</p>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {interview.completed_at
                              ? new Date(interview.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : interview.status === 'in_progress' ? 'In Progress' : 'Scheduled'
                            }
                            {interview.duration_minutes && ` • ${interview.duration_minutes} min`}
                          </p>
                        </div>

                        {/* Score */}
                        {interview.status === 'completed' && !isIncomplete && (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: evaluation.overall_score >= 70 ? '#DCFCE7' : evaluation.overall_score >= 50 ? '#FEF3C7' : '#FEE2E2',
                            color: evaluation.overall_score >= 70 ? '#166534' : evaluation.overall_score >= 50 ? '#92400E' : '#DC2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                          }}>
                            {evaluation.overall_score}
                          </div>
                        )}

                        {/* Status Badge */}
                        <span className={`chip ${
                          interview.status === 'completed'
                            ? (isIncomplete ? 'chip-navy' : evaluation?.recommendation === 'proceed_to_l2' ? 'chip-green' : evaluation?.recommendation === 'hold' ? 'chip-blue' : 'chip-navy')
                            : 'chip-navy'
                        }`} style={{ minWidth: '100px', textAlign: 'center' }}>
                          {interview.status === 'completed'
                            ? (isIncomplete ? 'Incomplete' : evaluation?.recommendation === 'proceed_to_l2' ? 'Proceed to L2' : evaluation?.recommendation === 'hold' ? 'Hold' : 'Not Recommended')
                            : interview.status === 'in_progress' ? 'In Progress'
                            : interview.status === 'cancelled' ? 'Cancelled'
                            : 'Scheduled'
                          }
                        </span>

                        {/* Expand Icon */}
                        {interview.status === 'completed' && !isIncomplete && (
                          <ChevronDown size={20} style={{
                            color: 'var(--text-muted)',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }} />
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && evaluation && (
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-light)' }}>
                          <div style={{ paddingTop: '16px' }}>
                            {/* Score Breakdown */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                              {[
                                { label: 'Communication', score: evaluation.communication_score },
                                { label: 'Technical', score: evaluation.technical_score },
                                { label: 'Culture Fit', score: evaluation.culture_fit_score },
                                { label: 'Enthusiasm', score: evaluation.enthusiasm_score },
                              ].map(item => (
                                <div key={item.label} style={{ textAlign: 'center' }}>
                                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</p>
                                  <p style={{
                                    margin: 0,
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: item.score >= 70 ? '#166534' : item.score >= 50 ? '#92400E' : '#DC2626',
                                  }}>{item.score}</p>
                                </div>
                              ))}
                            </div>

                            {/* Summary */}
                            {evaluation.summary && (
                              <p style={{ margin: '0 0 16px', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-secondary)', background: 'white', padding: '12px', borderRadius: '8px' }}>
                                "{evaluation.summary}"
                              </p>
                            )}

                            {/* Strengths & Concerns */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              {evaluation.strengths?.length > 0 && (
                                <div>
                                  <h5 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#166534' }}>Strengths</h5>
                                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
                                    {evaluation.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                              )}
                              {evaluation.concerns?.length > 0 && (
                                <div>
                                  <h5 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#DC2626' }}>Concerns</h5>
                                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
                                    {evaluation.concerns.slice(0, 3).map((c, i) => <li key={i}>{c}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Suggested L2 Questions */}
                            {evaluation.suggested_l2_questions?.length > 0 && (
                              <div style={{ marginTop: '16px' }}>
                                <h5 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--brand-navy)' }}>Suggested L2 Questions</h5>
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {evaluation.suggested_l2_questions.slice(0, 3).map((q, i) => <li key={i}>{q}</li>)}
                                </ul>
                              </div>
                            )}

                            {/* Conversation Transcript */}
                            {interview.transcript?.length > 0 && (
                              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                                <h5 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                  Conversation Transcript
                                </h5>
                                <div style={{
                                  maxHeight: '300px',
                                  overflowY: 'auto',
                                  background: '#FAFAFA',
                                  borderRadius: '8px',
                                  padding: '12px',
                                }}>
                                  {interview.transcript.map((entry, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        display: 'flex',
                                        gap: '10px',
                                        marginBottom: '12px',
                                        flexDirection: entry.role === 'user' ? 'row-reverse' : 'row',
                                      }}
                                    >
                                      <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: entry.role === 'assistant' ? 'var(--brand-navy)' : '#E5E5E5',
                                        color: entry.role === 'assistant' ? 'white' : 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        flexShrink: 0,
                                      }}>
                                        {entry.role === 'assistant' ? 'A' : formatName(candidate?.name)?.charAt(0) || 'C'}
                                      </div>
                                      <div style={{
                                        maxWidth: '80%',
                                        padding: '8px 12px',
                                        borderRadius: entry.role === 'assistant' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                                        background: entry.role === 'assistant' ? 'white' : 'var(--brand-navy)',
                                        color: entry.role === 'assistant' ? 'var(--text-primary)' : 'white',
                                        fontSize: '0.8rem',
                                        lineHeight: 1.4,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                      }}>
                                        {entry.content}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// --- Walk-ins View ---
function WalkInsView({ showToast }) {
  const [drives, setDrives] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [driveView, setDriveView] = useState('details'); // details, registrations, checkin, leaderboard
  const [registrations, setRegistrations] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [walkinRegistering, setWalkinRegistering] = useState(false);
  const [lastToken, setLastToken] = useState(null);
  const [walkinForm, setWalkinForm] = useState({
    name: '',
    email: '',
    phone: '',
    experience_years: '',
    current_company: '',
    current_role: '',
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [driveSearchTerm, setDriveSearchTerm] = useState('');
  const [driveStatusFilter, setDriveStatusFilter] = useState('all'); // all, ongoing, registration_open, draft, completed

  // Create/Edit form state
  const [formData, setFormData] = useState({
    job_id: '',
    title: '',
    drive_date: '',
    total_capacity: '',
    test_enabled: true,
    questions_per_candidate: 20,
    test_duration_minutes: 30,
    passing_score_percent: 60,
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [driveInterviews, setDriveInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [answersCandidate, setAnswersCandidate] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [drivesRes, jobsRes] = await Promise.all([
        walkinApi.list(),
        jobsApi.list(),
      ]);
      setDrives(drivesRes.data);
      setJobs(jobsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDrive = async () => {
    if (!formData.job_id || !formData.title || !formData.drive_date) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        job_id: parseInt(formData.job_id),
        drive_date: new Date(formData.drive_date).toISOString(),
      };
      // Only include capacity if set
      if (!formData.total_capacity) {
        delete payload.total_capacity;
      }
      const res = await walkinApi.create(payload);
      setDrives(prev => [res.data, ...prev]);
      setShowCreateModal(false);
      setFormData({
        job_id: '',
        title: '',
        drive_date: '',
        total_capacity: '',
        test_enabled: true,
        questions_per_candidate: 20,
        test_duration_minutes: 30,
        passing_score_percent: 60,
      });
      showToast('Walk-in drive created!');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create drive', 'error');
    }
  };

  const handleSelectDrive = async (drive) => {
    setSelectedDrive(drive);
    setDriveView('details');

    // Clear old data immediately
    setRegistrations([]);
    setStats(null);
    setLeaderboard([]);
    setLastToken(null);
    setDriveInterviews([]);

    // Fetch registrations and stats for THIS drive
    try {
      const [regsRes, statsRes] = await Promise.all([
        walkinApi.getRegistrations(drive.id),
        walkinApi.getStats(drive.id),
      ]);
      setRegistrations(regsRes.data);
      setStats(statsRes.data);

      if (drive.test_enabled) {
        const lbRes = await walkinApi.getLeaderboard(drive.id);
        setLeaderboard(lbRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch drive data:', err);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedDrive) return;
    setGeneratingQuestions(true);

    try {
      const res = await walkinApi.generateQuestions(selectedDrive.id, {
        total_questions: selectedDrive.questions_per_candidate,
        mcq_ratio: 0.7,
      });
      showToast(`Generated ${res.data.question_count} questions!`);

      // Refresh drive
      const driveRes = await walkinApi.get(selectedDrive.id);
      setSelectedDrive(driveRes.data);
      setDrives(prev => prev.map(d => d.id === driveRes.data.id ? driveRes.data : d));
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to generate questions', 'error');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedDrive) return;

    try {
      const res = await walkinApi.update(selectedDrive.id, { status });
      setSelectedDrive(res.data);
      setDrives(prev => prev.map(d => d.id === res.data.id ? res.data : d));
      showToast(`Drive status updated to ${status.replace('_', ' ')}`);
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleOpenEdit = () => {
    if (!selectedDrive) return;
    // Pre-fill form with current drive data
    setFormData({
      job_id: selectedDrive.job_id,
      title: selectedDrive.title,
      drive_date: new Date(selectedDrive.drive_date).toISOString().slice(0, 16),
      total_capacity: selectedDrive.total_capacity || '',
      test_enabled: selectedDrive.test_enabled,
      questions_per_candidate: selectedDrive.questions_per_candidate,
      test_duration_minutes: selectedDrive.test_duration_minutes,
      passing_score_percent: selectedDrive.passing_score_percent,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDrive) return;

    try {
      const payload = {
        title: formData.title,
        drive_date: new Date(formData.drive_date).toISOString(),
        total_capacity: formData.total_capacity ? parseInt(formData.total_capacity) : null,
        test_enabled: formData.test_enabled,
        questions_per_candidate: formData.questions_per_candidate,
        test_duration_minutes: formData.test_duration_minutes,
        passing_score_percent: formData.passing_score_percent,
      };
      const res = await walkinApi.update(selectedDrive.id, payload);
      setSelectedDrive(res.data);
      setDrives(prev => prev.map(d => d.id === res.data.id ? res.data : d));
      setShowEditModal(false);
      showToast('Drive updated successfully!');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update drive', 'error');
    }
  };

  const handleDeleteDrive = () => {
    if (!selectedDrive) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Walk-in Drive',
      message: `Are you sure you want to delete "${selectedDrive.title}"? This will also delete all registrations.`,
      onConfirm: async () => {
        try {
          await walkinApi.delete(selectedDrive.id);
          setDrives(prev => prev.filter(d => d.id !== selectedDrive.id));
          setSelectedDrive(null);
          showToast('Drive deleted successfully');
        } catch (err) {
          showToast(err.response?.data?.detail || 'Failed to delete drive', 'error');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleWalkinRegister = async () => {
    if (!walkinForm.name || !walkinForm.email || !walkinForm.phone || !resumeFile || !selectedDrive) {
      showToast('Name, email, phone, and resume are required', 'error');
      return;
    }
    setWalkinRegistering(true);

    try {
      // Use FormData for file upload (resume is required)
      const formData = new FormData();
      formData.append('name', walkinForm.name);
      formData.append('email', walkinForm.email);
      formData.append('phone', walkinForm.phone);
      if (walkinForm.experience_years) formData.append('experience_years', walkinForm.experience_years);
      if (walkinForm.current_company) formData.append('current_company', walkinForm.current_company);
      if (walkinForm.current_role) formData.append('current_role', walkinForm.current_role);
      formData.append('resume', resumeFile);
      const res = await walkinApi.walkinRegisterWithResume(selectedDrive.id, formData);

      setLastToken({
        token_number: res.data.token_number,
        name: res.data.registration.name,
        message: res.data.message,
      });

      // Reset form
      setWalkinForm({
        name: '',
        email: '',
        phone: '',
        experience_years: '',
        current_company: '',
        current_role: '',
      });
      setResumeFile(null);

      // Refresh registrations
      const regsRes = await walkinApi.getRegistrations(selectedDrive.id);
      setRegistrations(regsRes.data);

      const statsRes = await walkinApi.getStats(selectedDrive.id);
      setStats(statsRes.data);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Registration failed', 'error');
    } finally {
      setWalkinRegistering(false);
    }
  };

  const handleShortlist = async (registrationId) => {
    try {
      await walkinApi.shortlist(selectedDrive.id, registrationId);
      showToast('Candidate shortlisted!');

      const regsRes = await walkinApi.getRegistrations(selectedDrive.id);
      setRegistrations(regsRes.data);
      const lbRes = await walkinApi.getLeaderboard(selectedDrive.id);
      setLeaderboard(lbRes.data);
    } catch (err) {
      showToast('Failed to shortlist', 'error');
    }
  };

  const handleReject = async (registrationId) => {
    try {
      await walkinApi.reject(selectedDrive.id, registrationId);
      showToast('Candidate rejected');

      const regsRes = await walkinApi.getRegistrations(selectedDrive.id);
      setRegistrations(regsRes.data);
    } catch (err) {
      showToast('Failed to reject', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return '#6B7280';
      case 'registration_open': return '#2563EB';
      case 'registration_closed': return '#F59E0B';
      case 'ongoing': return '#10B981';
      case 'completed': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-center" style={{ padding: '80px' }}>
        <Loader2 size={32} className="spin" />
      </motion.div>
    );
  }

  // Drive detail view
  if (selectedDrive) {
    const job = jobs.find(j => j.id === selectedDrive.job_id);

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        {/* Back button */}
        <button
          onClick={() => setSelectedDrive(null)}
          className="btn-pill"
          style={{ marginBottom: '20px' }}
        >
          <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Drives
        </button>

        {/* Drive Header */}
        <div className="sovereign-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 8px' }}>{selectedDrive.title}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                {job?.title} • {new Date(selectedDrive.drive_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <span style={{
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: `${getStatusColor(selectedDrive.status)}20`,
              color: getStatusColor(selectedDrive.status),
            }}>
              {selectedDrive.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Registered', value: stats.total_registered, icon: Users },
                { label: 'Checked In', value: stats.checked_in, icon: UserCheck },
                { label: 'Tested', value: stats.tested, icon: ClipboardList },
                { label: 'Passed', value: stats.passed, icon: Trophy },
                { label: 'Shortlisted', value: stats.shortlisted, icon: CheckCircle },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '12px', background: '#F9FAFB', borderRadius: '12px' }}>
                  <stat.icon size={20} style={{ color: 'var(--brand-navy)', marginBottom: '4px' }} />
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {selectedDrive.status === 'draft' && (
              <>
                <button className="btn-pill" onClick={handleOpenEdit}>
                  <Edit3 size={16} /> Edit Drive
                </button>
                <button
                  className="btn-pill"
                  onClick={handleDeleteDrive}
                  style={{ color: '#DC2626', borderColor: '#DC2626' }}
                >
                  <Trash2 size={16} /> Delete
                </button>
                {selectedDrive.test_enabled && (
                  <button className="btn-sarvam" onClick={handleGenerateQuestions} disabled={generatingQuestions}>
                    {generatingQuestions ? <Loader2 size={16} className="spin" /> : <ClipboardList size={16} />}
                    {selectedDrive.question_bank?.length ? 'Regenerate Questions' : 'Generate Questions'}
                  </button>
                )}
                <button className="btn-sarvam" onClick={() => handleUpdateStatus('registration_open')}>
                  Open Registration
                </button>
              </>
            )}
            {selectedDrive.status === 'registration_open' && (
              <>
                <button className="btn-sarvam" onClick={() => handleUpdateStatus('ongoing')}>
                  <Play size={16} /> Start Drive
                </button>
                <button className="btn-pill" onClick={() => handleUpdateStatus('registration_closed')}>
                  Close Registration
                </button>
              </>
            )}
            {selectedDrive.status === 'registration_closed' && (
              <button className="btn-sarvam" onClick={() => handleUpdateStatus('ongoing')}>
                <Play size={16} /> Start Drive
              </button>
            )}
            {selectedDrive.status === 'ongoing' && (
              <button className="btn-pill" onClick={() => handleUpdateStatus('completed')}>
                Complete Drive
              </button>
            )}

            {/* Copy registration link - only show when registration is open */}
            {selectedDrive.registration_slug && selectedDrive.status === 'registration_open' && (
              <button
                className="btn-pill"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/register/${selectedDrive.registration_slug}`);
                  showToast('Registration link copied!');
                }}
              >
                Copy Registration Link
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {['details', 'registrations', 'checkin', ...(selectedDrive.test_enabled ? ['leaderboard'] : []), 'interviews'].map(tab => (
            <button
              key={tab}
              className={driveView === tab ? 'btn-sarvam' : 'btn-pill'}
              onClick={async () => {
                setDriveView(tab);
                if (tab === 'interviews' && selectedDrive?.id) {
                  setLoadingInterviews(true);
                  try {
                    const res = await walkinApi.getInterviews(selectedDrive.id);
                    setDriveInterviews(res.data);
                  } catch (err) {
                    console.error('Failed to fetch interviews:', err);
                  } finally {
                    setLoadingInterviews(false);
                  }
                }
              }}
              style={{ textTransform: 'capitalize' }}
            >
              {tab === 'checkin' ? 'Front Desk' : tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {driveView === 'details' && (
          <div className="sovereign-card">
            <h3 style={{ margin: '0 0 16px' }}>Drive Configuration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Capacity</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{selectedDrive.total_capacity || 'No limit'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Test Enabled</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{selectedDrive.test_enabled ? 'Yes' : 'No'}</p>
              </div>
              {selectedDrive.test_enabled && (
                <>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Questions per Candidate</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{selectedDrive.questions_per_candidate}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Test Duration</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{selectedDrive.test_duration_minutes} minutes</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Passing Score</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{selectedDrive.passing_score_percent}%</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Question Bank</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{selectedDrive.question_bank?.length || 0} questions</p>
                  </div>
                </>
              )}
            </div>

            {/* Test Link for Candidates */}
            {selectedDrive.test_enabled && selectedDrive.question_bank?.length > 0 && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: '#EEF2FF',
                borderRadius: '8px',
                border: '1px solid #C7D2FE',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.9rem', fontWeight: 600, color: '#4F46E5' }}>
                  Candidate Test Portal
                </p>
                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Share this link with candidates or open on test kiosks:
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={`${window.location.origin}?test=${selectedDrive.id}`}
                    readOnly
                    className="input-elegant"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                  <button
                    className="btn-sarvam"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}?test=${selectedDrive.id}`);
                      showToast('Test link copied!');
                    }}
                    style={{ padding: '8px 16px' }}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {driveView === 'registrations' && (
          <div className="sovereign-card">
            <h3 style={{ margin: '0 0 16px' }}>Registrations ({registrations.length})</h3>
            {registrations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No registrations yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {registrations.map(reg => (
                  <div key={reg.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{reg.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {reg.email} • {reg.phone} • Code: {reg.registration_code}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {reg.token_number && (
                        <span style={{ fontWeight: 600, color: 'var(--brand-navy)' }}>#{reg.token_number}</span>
                      )}
                      {reg.test_score !== null && (
                        <span className={`chip ${reg.test_passed ? 'chip-green' : 'chip-navy'}`}>
                          {Math.round(reg.test_score)}%
                        </span>
                      )}
                      <span className="chip chip-blue" style={{ textTransform: 'capitalize' }}>
                        {reg.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {driveView === 'checkin' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Registration Form */}
            <div className="sovereign-card">
              <h3 style={{ margin: '0 0 16px' }}>Front Desk - Walk-in Registration</h3>

              {/* Show message if registration is not open */}
              {!['registration_open', 'ongoing'].includes(selectedDrive.status) && (
                <div style={{
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                }}>
                  <AlertCircle size={32} style={{ color: '#F59E0B', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontWeight: 600, color: '#92400E' }}>
                    {selectedDrive.status === 'draft' && 'Drive is in draft. Open registration to start.'}
                    {selectedDrive.status === 'registration_closed' && 'Registration is closed.'}
                    {selectedDrive.status === 'completed' && 'Drive has been completed.'}
                    {selectedDrive.status === 'cancelled' && 'Drive has been cancelled.'}
                  </p>
                </div>
              )}

              {['registration_open', 'ongoing'].includes(selectedDrive.status) && lastToken && (
                <div style={{
                  background: '#E8F5E9',
                  border: '2px solid #4CAF50',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}>
                  <p style={{ margin: '0 0 8px', color: '#4CAF50', fontWeight: 600 }}>Registration Successful!</p>
                  <p style={{ margin: '0 0 4px', fontSize: '0.9rem' }}>{lastToken.name}</p>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: 700,
                    color: 'var(--brand-navy)',
                  }}>
                    Token #{lastToken.token_number}
                  </div>
                  <button
                    onClick={() => setLastToken(null)}
                    style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Register Next Candidate
                  </button>
                </div>
              )}

              {['registration_open', 'ongoing'].includes(selectedDrive.status) && !lastToken && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Full Name *</label>
                    <input
                      type="text"
                      value={walkinForm.name}
                      onChange={(e) => setWalkinForm({ ...walkinForm, name: e.target.value })}
                      className="input-elegant"
                      placeholder="Enter candidate name"
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Email *</label>
                      <input
                        type="email"
                        value={walkinForm.email}
                        onChange={(e) => setWalkinForm({ ...walkinForm, email: e.target.value })}
                        className="input-elegant"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Phone *</label>
                      <input
                        type="tel"
                        value={walkinForm.phone}
                        onChange={(e) => setWalkinForm({ ...walkinForm, phone: e.target.value })}
                        className="input-elegant"
                        placeholder="9876543210"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Experience (years)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={walkinForm.experience_years}
                        onChange={(e) => setWalkinForm({ ...walkinForm, experience_years: e.target.value })}
                        className="input-elegant"
                        placeholder="e.g., 2.5"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Current Role</label>
                      <input
                        type="text"
                        value={walkinForm.current_role}
                        onChange={(e) => setWalkinForm({ ...walkinForm, current_role: e.target.value })}
                        className="input-elegant"
                        placeholder="e.g., Software Engineer"
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Current Company</label>
                    <input
                      type="text"
                      value={walkinForm.current_company}
                      onChange={(e) => setWalkinForm({ ...walkinForm, current_company: e.target.value })}
                      className="input-elegant"
                      placeholder="e.g., Acme Corp"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Resume *</label>
                    <div
                      style={{
                        position: 'relative',
                        border: `2px dashed ${resumeFile ? '#10B981' : '#D1D5DB'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: resumeFile ? '#F0FDF4' : '#F9FAFB',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => document.getElementById('resume-input').click()}
                    >
                      <input
                        id="resume-input"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setResumeFile(e.target.files[0] || null)}
                        style={{ display: 'none' }}
                      />
                      {resumeFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <FileText size={20} style={{ color: '#10B981' }} />
                          <span style={{ color: '#166534', fontWeight: 500 }}>{resumeFile.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}
                            style={{
                              background: '#FEE2E2',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              marginLeft: '4px',
                            }}
                          >
                            <X size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload size={24} style={{ color: '#9CA3AF', marginBottom: '4px' }} />
                          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>
                            Click to upload resume
                          </p>
                          <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: '0.75rem' }}>
                            PDF, DOC, DOCX
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn-sarvam"
                    onClick={handleWalkinRegister}
                    disabled={walkinRegistering || !walkinForm.name || !walkinForm.email || !walkinForm.phone || !resumeFile}
                    style={{ marginTop: '8px', padding: '14px' }}
                  >
                    {walkinRegistering ? <Loader2 size={18} className="spin" /> : <UserCheck size={18} />}
                    Register & Get Token
                  </button>
                </div>
              )}
            </div>

            {/* Recent Registrations */}
            <div className="sovereign-card">
              <h3 style={{ margin: '0 0 16px' }}>Today's Registrations ({registrations.filter(r => r.checked_in_at).length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                {registrations
                  .filter(r => r.checked_in_at)
                  .sort((a, b) => new Date(b.checked_in_at) - new Date(a.checked_in_at))
                  .map(reg => (
                    <div key={reg.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: reg.status === 'shortlisted' ? '#E8F5E9' : reg.status === 'rejected' ? '#FEE2E2' : '#F8F9FA',
                      borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--brand-navy)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}>
                          {reg.token_number}
                        </span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600 }}>{reg.name}</p>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {reg.experience_years ? `${reg.experience_years} yrs` : 'Fresher'} | {reg.phone}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: reg.test_passed === true ? '#4CAF50' : reg.test_passed === false ? '#EF4444' : '#94A3B8',
                          color: 'white',
                        }}>
                          {reg.test_score !== null ? `${Math.round(reg.test_score)}%` : reg.status.replace('_', ' ')}
                        </span>
                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(reg.checked_in_at + 'Z').toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                {registrations.filter(r => r.checked_in_at).length === 0 && (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No registrations yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {driveView === 'leaderboard' && selectedDrive.test_enabled && (
          <div className="sovereign-card">
            <h3 style={{ margin: '0 0 16px' }}>Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No test results yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leaderboard.filter(l => l.test_score !== null).map((entry, i) => (
                  <div key={entry.registration_id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: i < 3 ? '#FEF3C7' : entry.test_passed ? '#E8F5E9' : '#FEE2E2',
                    borderRadius: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: i < 3 ? '#F59E0B' : 'var(--brand-navy)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}>
                        {i + 1}
                      </span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>{entry.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {entry.experience_years ? `${entry.experience_years} yrs exp` : 'Experience N/A'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: entry.test_passed ? '#166534' : '#DC2626' }}>
                          {Math.round(entry.test_score)}%
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {entry.test_passed ? 'PASSED' : 'FAILED'}
                        </p>
                      </div>
                      {entry.status !== 'shortlisted' && entry.status !== 'rejected' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleShortlist(entry.registration_id)}
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              background: '#E8F5E9',
                              color: '#166534',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title="Shortlist"
                          >
                            <UserCheck size={18} />
                          </button>
                          <button
                            onClick={() => handleReject(entry.registration_id)}
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title="Reject"
                          >
                            <UserX size={18} />
                          </button>
                        </div>
                      )}
                      {entry.status === 'shortlisted' && (
                        <span className="chip chip-green">Shortlisted</span>
                      )}
                      {entry.status === 'rejected' && (
                        <span className="chip chip-navy">Rejected</span>
                      )}
                      <button
                        onClick={() => {
                          const reg = registrations.find(r => r.id === entry.registration_id);
                          setSelectedCandidate({ ...entry, ...reg });
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: '#F3F4F6',
                          color: 'var(--text-secondary)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Interviews Tab */}
        {driveView === 'interviews' && (
          <div className="sovereign-card">
            <h3 style={{ margin: '0 0 16px' }}>L1 Interviews with Arun</h3>
            {loadingInterviews ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Loader2 size={32} className="spin" style={{ color: 'var(--brand-navy)' }} />
                <p style={{ margin: '12px 0 0', color: 'var(--text-muted)' }}>Loading interviews...</p>
              </div>
            ) : driveInterviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Phone size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No interviews yet. Shortlisted candidates can start their L1 interview from the test portal.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {driveInterviews.map(interview => {
                  const evaluation = interview.evaluation || {};
                  const candidate = interview.candidate || {};
                  return (
                    <div
                      key={interview.id}
                      style={{
                        padding: '20px',
                        background: interview.status === 'completed' ? '#F0FDF4' : '#FEF3C7',
                        border: `1px solid ${interview.status === 'completed' ? '#10B981' : '#F59E0B'}`,
                        borderRadius: '12px',
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{candidate.name || 'Unknown'}</h4>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {candidate.email}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {interview.duration_minutes && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {interview.duration_minutes} min
                            </span>
                          )}
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: interview.status === 'completed' ? '#DCFCE7' : interview.status === 'in_progress' ? '#FEF3C7' : '#E0E7FF',
                            color: interview.status === 'completed' ? '#166534' : interview.status === 'in_progress' ? '#92400E' : '#4338CA',
                          }}>
                            {interview.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {interview.status === 'completed' && evaluation && (
                        <>
                          {/* Scores Grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: '12px',
                            padding: '16px',
                            background: 'white',
                            borderRadius: '8px',
                            marginBottom: '16px',
                          }}>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: evaluation.overall_score >= 70 ? '#166534' : evaluation.overall_score >= 50 ? '#F59E0B' : '#DC2626' }}>
                                {evaluation.overall_score != null ? Math.round(evaluation.overall_score) : '-'}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overall</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: 'var(--brand-navy)' }}>
                                {evaluation.communication_score != null ? Math.round(evaluation.communication_score) : '-'}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Communication</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: 'var(--brand-navy)' }}>
                                {evaluation.technical_score != null ? Math.round(evaluation.technical_score) : '-'}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Technical</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: 'var(--brand-navy)' }}>
                                {evaluation.culture_fit_score != null ? Math.round(evaluation.culture_fit_score) : '-'}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Culture Fit</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600, color: 'var(--brand-navy)' }}>
                                {evaluation.enthusiasm_score != null ? Math.round(evaluation.enthusiasm_score) : '-'}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enthusiasm</p>
                            </div>
                          </div>

                          {/* Recommendation */}
                          {evaluation.recommendation && (
                            <div style={{
                              padding: '12px 16px',
                              background: evaluation.recommendation === 'proceed_to_l2' ? '#DCFCE7' : evaluation.recommendation === 'reject' ? '#FEE2E2' : '#FEF3C7',
                              borderRadius: '8px',
                              marginBottom: '12px',
                            }}>
                              <span style={{
                                fontWeight: 600,
                                color: evaluation.recommendation === 'proceed_to_l2' ? '#166534' : evaluation.recommendation === 'reject' ? '#991B1B' : '#92400E',
                              }}>
                                Recommendation: {evaluation.recommendation.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                          )}

                          {/* Summary */}
                          {evaluation.summary && (
                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {evaluation.summary}
                              </p>
                            </div>
                          )}

                          {/* Strengths & Concerns */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {evaluation.strengths?.length > 0 && (
                              <div>
                                <h5 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#166534' }}>Strengths</h5>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {evaluation.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                            {evaluation.concerns?.length > 0 && (
                              <div>
                                <h5 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#DC2626' }}>Concerns</h5>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {evaluation.concerns.slice(0, 3).map((c, i) => <li key={i}>{c}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {interview.status !== 'completed' && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px',
                          background: 'white',
                          borderRadius: '8px',
                        }}>
                          <Clock size={18} style={{ color: '#F59E0B' }} />
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400E' }}>
                            {interview.status === 'in_progress' ? 'Interview is currently in progress...' : 'Interview scheduled - waiting for candidate'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* Candidate Detail Modal */}
      <Modal isOpen={!!selectedCandidate} onClose={() => setSelectedCandidate(null)} title="Candidate Details">
        {selectedCandidate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Basic Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: selectedCandidate.status === 'shortlisted' ? '#10B981' : selectedCandidate.status === 'rejected' ? '#EF4444' : 'var(--brand-navy)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
              }}>
                {selectedCandidate.token_number || '#'}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{selectedCandidate.name}</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Token #{selectedCandidate.token_number}
                </p>
                {selectedCandidate.status && (
                  <span style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    background: selectedCandidate.status === 'shortlisted' ? '#DCFCE7' : selectedCandidate.status === 'rejected' ? '#FEE2E2' : '#F3F4F6',
                    color: selectedCandidate.status === 'shortlisted' ? '#166534' : selectedCandidate.status === 'rejected' ? '#991B1B' : '#4B5563',
                  }}>
                    {selectedCandidate.status.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Contact Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 500 }}>{selectedCandidate.email}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 500 }}>{selectedCandidate.phone}</p>
                </div>
              </div>
            </div>

            {/* Experience Info */}
            <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Professional Info</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Experience</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 500 }}>{selectedCandidate.experience_years ? `${selectedCandidate.experience_years} years` : 'Fresher'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Role</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 500 }}>{selectedCandidate.current_role || 'N/A'}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Company</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 500 }}>{selectedCandidate.current_company || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Test Results */}
            {selectedCandidate.test_score !== null && (
              <div style={{ background: selectedCandidate.test_passed ? '#DCFCE7' : '#FEE2E2', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: selectedCandidate.test_passed ? '#166534' : '#991B1B' }}>Test Results</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700, color: selectedCandidate.test_passed ? '#166534' : '#991B1B' }}>
                      {Math.round(selectedCandidate.test_score)}%
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: selectedCandidate.test_passed ? '#166534' : '#991B1B' }}>
                      {selectedCandidate.test_passed ? 'PASSED' : 'FAILED'}
                    </p>
                  </div>
                  {selectedCandidate.test_score_breakdown && (
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontSize: '0.8rem' }}>
                        MCQ: {selectedCandidate.test_score_breakdown.mcq?.earned || 0} / {selectedCandidate.test_score_breakdown.mcq?.total || 0}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem' }}>
                        Short Answer: {selectedCandidate.test_score_breakdown.short_answer?.earned || 0} / {selectedCandidate.test_score_breakdown.short_answer?.total || 0}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interview Results */}
            {selectedCandidate.interview_status && (
              <div style={{
                background: selectedCandidate.interview_status === 'completed' ? '#EEF2FF' : '#FEF3C7',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: selectedCandidate.interview_status === 'completed' ? '#4F46E5' : '#92400E' }}>
                  L1 Interview with Arun
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  {selectedCandidate.interview_status === 'completed' ? (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700, color: '#4F46E5' }}>
                          {selectedCandidate.interview_score != null ? `${Math.round(selectedCandidate.interview_score)}%` : '-'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#4F46E5' }}>COMPLETED</p>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={20} style={{ color: '#92400E' }} />
                      <p style={{ margin: 0, color: '#92400E', fontWeight: 500 }}>
                        {selectedCandidate.interview_status === 'in_progress' ? 'Interview in progress...' : 'Interview scheduled'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View Answers Button */}
            {selectedCandidate.answers && Object.keys(selectedCandidate.answers).length > 0 && (
              <button
                className="btn-pill"
                onClick={() => setAnswersCandidate(selectedCandidate)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ClipboardList size={16} /> View Test Answers
              </button>
            )}

            {/* Action Buttons */}
            {selectedCandidate.status !== 'shortlisted' && selectedCandidate.status !== 'rejected' && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  className="btn-sarvam"
                  onClick={() => {
                    handleShortlist(selectedCandidate.registration_id || selectedCandidate.id);
                    setSelectedCandidate(null);
                  }}
                  style={{ flex: 1 }}
                >
                  <UserCheck size={18} /> Shortlist
                </button>
                <button
                  className="btn-pill"
                  onClick={() => {
                    handleReject(selectedCandidate.registration_id || selectedCandidate.id);
                    setSelectedCandidate(null);
                  }}
                  style={{ flex: 1, color: '#DC2626', borderColor: '#DC2626' }}
                >
                  <UserX size={18} /> Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Answers Modal */}
      {answersCandidate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Test Answers</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {answersCandidate.name} • Token #{answersCandidate.token_number} • Score: {Math.round(answersCandidate.test_score || 0)}%
                </p>
              </div>
              <button
                onClick={() => setAnswersCandidate(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {(answersCandidate.assigned_questions || []).map((qId, idx) => {
                  const question = selectedDrive?.question_bank?.find(q => q.id === qId);
                  if (!question) return null;
                  const answer = answersCandidate.answers?.[qId];
                  const isCorrect = question.type === 'mcq' && answer?.toUpperCase() === question.correct_answer?.toUpperCase();

                  return (
                    <div key={qId} style={{
                      background: '#F9FAFB',
                      borderRadius: '12px',
                      padding: '20px',
                      borderLeft: question.type === 'mcq'
                        ? `4px solid ${isCorrect ? '#10B981' : '#EF4444'}`
                        : '4px solid #6366F1',
                    }}>
                      {/* Question Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--brand-navy)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                          }}>
                            {idx + 1}
                          </span>
                          <div>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: '#E5E7EB',
                              marginRight: '8px',
                            }}>
                              {question.skill}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: question.type === 'mcq' ? '#DBEAFE' : '#E0E7FF',
                              color: question.type === 'mcq' ? '#1D4ED8' : '#4338CA',
                            }}>
                              {question.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                            </span>
                          </div>
                        </div>
                        {question.type === 'mcq' && (
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: isCorrect ? '#DCFCE7' : '#FEE2E2',
                            color: isCorrect ? '#166534' : '#991B1B',
                          }}>
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        )}
                      </div>

                      {/* Question Text */}
                      <p style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 }}>
                        {question.question}
                      </p>

                      {/* MCQ Options */}
                      {question.type === 'mcq' && question.options && (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {question.options.map(opt => {
                            const isSelected = opt.label === answer;
                            const isCorrectOption = opt.label === question.correct_answer;

                            return (
                              <div key={opt.label} style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: isCorrectOption
                                  ? '#DCFCE7'
                                  : isSelected && !isCorrectOption
                                    ? '#FEE2E2'
                                    : 'white',
                                border: `2px solid ${
                                  isCorrectOption
                                    ? '#10B981'
                                    : isSelected && !isCorrectOption
                                      ? '#EF4444'
                                      : '#E5E7EB'
                                }`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                              }}>
                                <span style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background: isCorrectOption ? '#10B981' : isSelected ? '#EF4444' : '#E5E7EB',
                                  color: isCorrectOption || isSelected ? 'white' : '#4B5563',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                }}>
                                  {opt.label}
                                </span>
                                <span style={{ flex: 1 }}>{opt.text}</span>
                                {isCorrectOption && <CheckCircle size={20} style={{ color: '#10B981' }} />}
                                {isSelected && !isCorrectOption && <XCircle size={20} style={{ color: '#EF4444' }} />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Short Answer */}
                      {question.type === 'short_answer' && (
                        <div>
                          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            Candidate's Answer:
                          </p>
                          <div style={{
                            padding: '16px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            fontSize: '0.95rem',
                            lineHeight: 1.6,
                            fontStyle: answer ? 'normal' : 'italic',
                            color: answer ? 'inherit' : 'var(--text-muted)',
                          }}>
                            {answer || 'No answer provided'}
                          </div>
                          {question.expected_keywords && question.expected_keywords.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                              <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Expected Keywords:
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {question.expected_keywords.map((kw, i) => (
                                  <span key={i} style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    background: answer?.toLowerCase().includes(kw.toLowerCase()) ? '#DCFCE7' : '#F3F4F6',
                                    color: answer?.toLowerCase().includes(kw.toLowerCase()) ? '#166534' : '#6B7280',
                                    border: `1px solid ${answer?.toLowerCase().includes(kw.toLowerCase()) ? '#10B981' : '#E5E7EB'}`,
                                  }}>
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="danger"
      />

      {/* Edit Drive Modal (for detail view) */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Walk-in Drive">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Drive Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Backend Developer Walk-in - May 2026"
              className="input-elegant"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Drive Date *</label>
            <input
              type="datetime-local"
              value={formData.drive_date}
              onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
              className="input-elegant"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Expected Capacity (optional)</label>
            <input
              type="number"
              value={formData.total_capacity}
              onChange={(e) => setFormData({ ...formData, total_capacity: e.target.value ? parseInt(e.target.value) : '' })}
              placeholder="Leave empty for no limit"
              className="input-elegant"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="edit_test_enabled_detail"
              checked={formData.test_enabled}
              onChange={(e) => setFormData({ ...formData, test_enabled: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="edit_test_enabled_detail" style={{ fontSize: '0.9rem' }}>Enable Assessment Test</label>
          </div>

          {formData.test_enabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '16px', background: '#F9FAFB', borderRadius: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Questions/Candidate</label>
                <input
                  type="number"
                  min="1"
                  value={formData.questions_per_candidate}
                  onChange={(e) => setFormData({ ...formData, questions_per_candidate: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, questions_per_candidate: parseInt(e.target.value) || 20 })}
                  className="input-elegant"
                  style={{ padding: '8px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.test_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, test_duration_minutes: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, test_duration_minutes: parseInt(e.target.value) || 30 })}
                  className="input-elegant"
                  style={{ padding: '8px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Passing %</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.passing_score_percent}
                  onChange={(e) => setFormData({ ...formData, passing_score_percent: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, passing_score_percent: parseInt(e.target.value) || 60 })}
                  className="input-elegant"
                  style={{ padding: '8px 12px' }}
                />
              </div>
            </div>
          )}

          <button className="btn-sarvam" onClick={handleSaveEdit} style={{ marginTop: '8px' }}>
            Save Changes
          </button>
        </div>
      </Modal>
      </motion.div>
    );
  }

  // Drive list view
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Walk-in Drives</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            Conduct walk-in recruitment drives with assessments
          </p>
        </div>
        <button className="btn-sarvam" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Create Drive
        </button>
      </div>

      {/* Search and Filter */}
      {drives.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search drives..."
              value={driveSearchTerm}
              onChange={(e) => setDriveSearchTerm(e.target.value)}
              className="input-elegant"
              style={{ paddingLeft: '40px', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'ongoing', 'registration_open', 'draft', 'completed'].map(status => (
              <button
                key={status}
                className={driveStatusFilter === status ? 'btn-sarvam' : 'btn-pill'}
                onClick={() => setDriveStatusFilter(status)}
                style={{ fontSize: '0.85rem', padding: '8px 16px', textTransform: 'capitalize' }}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drives List */}
      {drives.length === 0 ? (
        <div className="sovereign-card" style={{ textAlign: 'center', padding: '60px' }}>
          <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px' }}>No Walk-in Drives</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Create your first walk-in drive to get started.</p>
          <button className="btn-sarvam" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Create Drive
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {drives
            // Filter by status
            .filter(drive => driveStatusFilter === 'all' || drive.status === driveStatusFilter)
            // Filter by search term
            .filter(drive => {
              if (!driveSearchTerm.trim()) return true;
              const term = driveSearchTerm.toLowerCase();
              const job = jobs.find(j => j.id === drive.job_id);
              return (
                drive.title.toLowerCase().includes(term) ||
                job?.title?.toLowerCase().includes(term)
              );
            })
            // Sort: ongoing first, then by date descending
            .sort((a, b) => {
              // Priority: ongoing > registration_open > draft > completed
              const statusPriority = { ongoing: 0, registration_open: 1, draft: 2, completed: 3 };
              const priorityDiff = (statusPriority[a.status] ?? 4) - (statusPriority[b.status] ?? 4);
              if (priorityDiff !== 0) return priorityDiff;
              // Same status: sort by date descending
              return new Date(b.drive_date) - new Date(a.drive_date);
            })
            .map(drive => {
            const job = jobs.find(j => j.id === drive.job_id);
            return (
              <div
                key={drive.id}
                className="sovereign-card"
                style={{
                  cursor: 'pointer',
                  border: drive.status === 'ongoing' ? '2px solid #10B981' : undefined,
                }}
                onClick={() => handleSelectDrive(drive)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: '0' }}>{drive.title}</h3>
                      {drive.status === 'ongoing' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          background: '#10B981',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}>
                          <span style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                          LIVE
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {job?.title} • {new Date(drive.drive_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{drive.registered_count || 0}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered</p>
                    </div>
                    <span style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: `${getStatusColor(drive.status)}20`,
                      color: getStatusColor(drive.status),
                      textTransform: 'capitalize',
                    }}>
                      {drive.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span><Users size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Capacity: {drive.total_capacity || 'No limit'}</span>
                  <span><ClipboardList size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Test: {drive.test_enabled ? 'Enabled' : 'Disabled'}</span>
                  {drive.test_enabled && (
                    <span><Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {drive.test_duration_minutes} min</span>
                  )}
                </div>
              </div>
            );
          })}
          {/* No results message */}
          {drives.length > 0 && drives
            .filter(drive => driveStatusFilter === 'all' || drive.status === driveStatusFilter)
            .filter(drive => {
              if (!driveSearchTerm.trim()) return true;
              const term = driveSearchTerm.toLowerCase();
              const job = jobs.find(j => j.id === drive.job_id);
              return drive.title.toLowerCase().includes(term) || job?.title?.toLowerCase().includes(term);
            }).length === 0 && (
            <div className="sovereign-card" style={{ textAlign: 'center', padding: '40px' }}>
              <Search size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                No drives found matching your filters.
              </p>
              <button
                className="btn-pill"
                onClick={() => { setDriveSearchTerm(''); setDriveStatusFilter('all'); }}
                style={{ marginTop: '12px' }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Drive Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Walk-in Drive">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Job Position *</label>
            <select
              value={formData.job_id}
              onChange={(e) => {
                const job = jobs.find(j => j.id === parseInt(e.target.value));
                setFormData({
                  ...formData,
                  job_id: e.target.value,
                  title: job ? `${job.title} Walk-in Drive` : '',
                });
              }}
              className="input-elegant"
              style={{ width: '100%' }}
            >
              <option value="">Select a job...</option>
              {jobs.filter(j => j.status === 'open').map(job => (
                <option key={job.id} value={job.id}>{job.title} - {job.department}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Drive Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Backend Developer Walk-in - May 2026"
              className="input-elegant"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Drive Date *</label>
            <input
              type="datetime-local"
              value={formData.drive_date}
              onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
              className="input-elegant"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Expected Capacity (optional)</label>
            <input
              type="number"
              value={formData.total_capacity}
              onChange={(e) => setFormData({ ...formData, total_capacity: e.target.value ? parseInt(e.target.value) : '' })}
              placeholder="Leave empty for no limit"
              className="input-elegant"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="test_enabled"
              checked={formData.test_enabled}
              onChange={(e) => setFormData({ ...formData, test_enabled: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="test_enabled" style={{ fontSize: '0.9rem' }}>Enable Assessment Test</label>
          </div>

          {formData.test_enabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '16px', background: '#F9FAFB', borderRadius: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Questions/Candidate</label>
                <input
                  type="number"
                  min="1"
                  value={formData.questions_per_candidate}
                  onChange={(e) => setFormData({ ...formData, questions_per_candidate: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, questions_per_candidate: parseInt(e.target.value) || 20 })}
                  className="input-elegant"
                  style={{ padding: '8px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.test_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, test_duration_minutes: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, test_duration_minutes: parseInt(e.target.value) || 30 })}
                  className="input-elegant"
                  style={{ padding: '8px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Passing %</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.passing_score_percent}
                  onChange={(e) => setFormData({ ...formData, passing_score_percent: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, passing_score_percent: parseInt(e.target.value) || 60 })}
                  className="input-elegant"
                  style={{ padding: '8px 12px' }}
                />
              </div>
            </div>
          )}

          <button className="btn-sarvam" onClick={handleCreateDrive} style={{ marginTop: '8px' }}>
            Create Drive
          </button>
        </div>
      </Modal>

      {/* Edit Drive Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Walk-in Drive">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Drive Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Backend Developer Walk-in - May 2026"
              className="input-elegant"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Drive Date *</label>
            <input
              type="datetime-local"
              value={formData.drive_date}
              onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
              className="input-elegant"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Expected Capacity (optional)</label>
            <input
              type="number"
              value={formData.total_capacity}
              onChange={(e) => setFormData({ ...formData, total_capacity: e.target.value ? parseInt(e.target.value) : '' })}
              placeholder="Leave empty for no limit"
              className="input-elegant"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="edit_test_enabled"
              checked={formData.test_enabled}
              onChange={(e) => setFormData({ ...formData, test_enabled: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="edit_test_enabled" style={{ fontSize: '0.9rem' }}>Enable Assessment Test</label>
          </div>

          {formData.test_enabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '16px', background: '#F9FAFB', borderRadius: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Questions/Candidate</label>
                <input
                  type="number"
                  min="1"
                  value={formData.questions_per_candidate}
                  onChange={(e) => setFormData({ ...formData, questions_per_candidate: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, questions_per_candidate: parseInt(e.target.value) || 20 })}
                  className="input-elegant"
                  style={{ padding: '8px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.test_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, test_duration_minutes: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, test_duration_minutes: parseInt(e.target.value) || 30 })}
                  className="input-elegant"
                  style={{ padding: '8px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Passing %</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.passing_score_percent}
                  onChange={(e) => setFormData({ ...formData, passing_score_percent: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, passing_score_percent: parseInt(e.target.value) || 60 })}
                  className="input-elegant"
                  style={{ padding: '8px 12px' }}
                />
              </div>
            </div>
          )}

          <button className="btn-sarvam" onClick={handleSaveEdit} style={{ marginTop: '8px' }}>
            Save Changes
          </button>
        </div>
      </Modal>
    </motion.div>
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
  const [analyzeJobId, setAnalyzeJobId] = useState('');
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

  const handleSourceForJob = async (jobId, maxResults) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await githubApi.sourceForJob(jobId, maxResults);
      setResults(res.data.candidates || []);
      const job = jobs.find(j => j.id === jobId);
      showToast(`Found ${res.data.total || 0} developers for "${job?.title || 'Job'}"`);
    } catch (err) {
      showToast('Sourcing failed: ' + (err.response?.data?.detail || err.message), 'error');
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
      const res = await githubApi.analyze(analyzeUsername.trim(), analyzeJobId || null);
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
    setAnalyzeJobId('');
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
        <GitHubSearchForm onSearch={handleSearch} onSourceForJob={handleSourceForJob} loading={loading} jobs={jobs} />
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
              Enter a GitHub username and select a job to analyze the profile against.
            </p>
            <input
              type="text"
              placeholder="e.g., torvalds"
              value={analyzeUsername}
              onChange={(e) => setAnalyzeUsername(e.target.value)}
              className="input-elegant"
              style={{ borderRadius: '12px' }}
              onKeyDown={(e) => e.key === 'Enter' && analyzeJobId && handleAnalyze()}
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Analyze for Job *
              </label>
              <select
                value={analyzeJobId}
                onChange={(e) => setAnalyzeJobId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-strong)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                }}
              >
                <option value="">Select a job to match against...</option>
                {jobs.filter(j => j.status === 'open').map(job => (
                  <option key={job.id} value={job.id}>{job.title} - {job.department || 'General'}</option>
                ))}
              </select>
              {jobs.filter(j => j.status === 'open').length === 0 && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No open jobs available. Create a job first to analyze profiles against it.
                </p>
              )}
            </div>
            <button className="btn-sarvam" onClick={handleAnalyze} disabled={analyzing || !analyzeUsername.trim() || !analyzeJobId}>
              {analyzing ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
              {analyzing ? 'Analyzing...' : 'Analyze Profile'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Job Context */}
            {analyzeJobId && (
              <div style={{ background: '#E8EEF8', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={16} color="var(--brand-navy)" />
                <span style={{ fontSize: '0.9rem', color: 'var(--brand-navy)' }}>
                  Analyzed for: <strong>{jobs.find(j => j.id === parseInt(analyzeJobId))?.title || 'Job'}</strong>
                </span>
              </div>
            )}
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

// --- Interview Portal (for candidates taking L1 interview with Arun) ---
function InterviewPortal({ interviewId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interview, setInterview] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [job, setJob] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadInterview = async () => {
      try {
        const interviewRes = await interviewApi.get(interviewId);
        const interviewData = interviewRes.data;

        // Check if already completed
        if (interviewData.status === 'completed') {
          setResult(interviewData.evaluation);
          setCompleted(true);
          setLoading(false);
          return;
        }

        // Fetch job and candidate details
        const [jobRes, candidateRes] = await Promise.all([
          jobsApi.get(interviewData.job_id),
          candidatesApi.get(interviewData.candidate_id),
        ]);

        setInterview(interviewData);
        setJob(jobRes.data);
        setCandidate(candidateRes.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load interview');
      } finally {
        setLoading(false);
      }
    };

    loadInterview();
  }, [interviewId]);

  const handleComplete = (evalResult) => {
    setResult(evalResult);
    setCompleted(true);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F1C2E 100%)',
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <Loader2 size={48} className="spin" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '1.2rem' }}>Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F1C2E 100%)',
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          maxWidth: '400px',
        }}>
          <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: '16px' }} />
          <h2 style={{ margin: '0 0 12px' }}>Error</h2>
          <p style={{ color: '#6B7280', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F1C2E 100%)',
      }}>
        <div style={{
          background: 'white',
          padding: '48px',
          borderRadius: '16px',
          textAlign: 'center',
          maxWidth: '500px',
        }}>
          <CheckCircle size={64} style={{ color: '#10B981', marginBottom: '20px' }} />
          <h2 style={{ margin: '0 0 12px', fontSize: '1.8rem' }}>Interview Complete!</h2>
          <p style={{ color: '#6B7280', margin: '0 0 16px', fontSize: '1.1rem' }}>
            Thank you for completing your interview with Arun.
          </p>
          <p style={{ color: '#9CA3AF', fontSize: '0.9rem', margin: 0 }}>
            Our team will review your interview and get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E3A5F 0%, #0F1C2E 100%)',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <InterviewRoom
          interview={interview}
          candidate={candidate}
          job={job}
          onComplete={handleComplete}
          onClose={() => setCompleted(true)}
        />
      </div>
    </div>
  );
}

// --- Candidate Test Portal ---
function CandidateTestPortal({ driveId }) {
  const [stage, setStage] = useState('login'); // login, test, result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [candidate, setCandidate] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Timer effect
  useEffect(() => {
    if (stage !== 'test' || timeLeft === null) return;

    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, stage]);

  const handleLookup = async () => {
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await walkinApi.lookupCandidate(driveId, { phone: phone.trim() });
      setCandidate(res.data);

      if (res.data.test_completed) {
        setResult({
          score: res.data.test_score,
          passed: res.data.test_passed,
        });
        setStage('result');
      } else if (!res.data.test_enabled) {
        setError('Test is not enabled for this drive');
      } else if (res.data.drive_status === 'completed') {
        setError('This drive has ended. Please contact HR for any queries.');
      } else if (res.data.drive_status !== 'ongoing') {
        setError('Test is not available yet. Please wait for the drive to start.');
      } else if (res.data.test_started && res.data.remaining_seconds > 0) {
        // Test was started but not completed - resume it
        setStage('resuming');
      } else if (res.data.test_started && res.data.remaining_seconds <= 0) {
        setError('Your test time has expired. Please contact the HR desk.');
      } else {
        // Ready to start new test
        setStage('ready');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not find your registration');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await walkinApi.startTest(driveId, candidate.registration_id);
      setQuestions(res.data.questions);
      setTimeLeft(res.data.duration_minutes * 60);
      setStage('test');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start test');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeTest = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await walkinApi.resumeTest(driveId, candidate.registration_id);
      setQuestions(res.data.questions);
      setTimeLeft(res.data.remaining_seconds);
      setAnswers(res.data.answers || {});
      setStage('test');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not resume test');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const res = await walkinApi.submitTest(driveId, candidate.registration_id, answers);
      setResult({
        score: res.data.score_percent,
        passed: res.data.passed,
        earned: res.data.earned_points,
        total: res.data.total_points,
      });
      setStage('result');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: stage === 'test' ? '900px' : '500px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px', color: 'white' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.8rem' }}>Walk-in Assessment</h1>
          {candidate && (
            <p style={{ margin: 0, opacity: 0.9 }}>
              Welcome, {candidate.name} (Token #{candidate.token_number})
            </p>
          )}
        </div>

        {/* Login Stage */}
        {stage === 'login' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: '0 0 24px', textAlign: 'center' }}>Enter Your Details</h2>

            {error && (
              <div style={{
                background: '#FEE2E2',
                color: '#DC2626',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.9rem',
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="Enter registered phone number"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1.1rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  outline: 'none',
                }}
                autoFocus
              />
            </div>

            <button
              onClick={handleLookup}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#4F46E5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? <Loader2 size={20} className="spin" /> : <Search size={20} />}
              Find My Registration
            </button>
          </div>
        )}

        {/* Ready Stage */}
        {stage === 'ready' && candidate && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#4F46E5',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 700,
              margin: '0 auto 20px',
            }}>
              {candidate.token_number}
            </div>

            <h2 style={{ margin: '0 0 8px' }}>{candidate.name}</h2>
            <p style={{ color: '#6B7280', margin: '0 0 24px' }}>Token #{candidate.token_number}</p>

            <div style={{
              background: '#F3F4F6',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Test Instructions</h3>
              <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '20px', color: '#4B5563' }}>
                <li>Duration: {candidate.test_duration_minutes} minutes</li>
                <li>Questions: Multiple choice and short answer</li>
                <li>Do not refresh or close the browser</li>
                <li>Test auto-submits when time runs out</li>
              </ul>
            </div>

            <button
              onClick={handleStartTest}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? <Loader2 size={20} className="spin" /> : <Play size={20} />}
              Start Test
            </button>
          </div>
        )}

        {/* Resuming Stage */}
        {stage === 'resuming' && candidate && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#F59E0B',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 700,
              margin: '0 auto 20px',
            }}>
              {candidate.token_number}
            </div>

            <h2 style={{ margin: '0 0 8px' }}>{candidate.name}</h2>
            <p style={{ color: '#6B7280', margin: '0 0 24px' }}>Token #{candidate.token_number}</p>

            <div style={{
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#92400E' }}>Resume Your Test</h3>
              <p style={{ margin: 0, color: '#92400E' }}>
                You have an incomplete test. Time remaining: <strong>{Math.floor(candidate.remaining_seconds / 60)}:{(candidate.remaining_seconds % 60).toString().padStart(2, '0')}</strong>
              </p>
            </div>

            <button
              onClick={handleResumeTest}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: '#F59E0B',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? <Loader2 size={20} className="spin" /> : <Play size={20} />}
              Resume Test
            </button>
          </div>
        )}

        {/* Test Stage */}
        {stage === 'test' && (
          <div>
            {/* Timer Bar */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px 24px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}>
              <span style={{ fontWeight: 600 }}>
                {Object.keys(answers).length} / {questions.length} answered
              </span>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: timeLeft < 60 ? '#DC2626' : timeLeft < 300 ? '#F59E0B' : '#10B981',
              }}>
                <Clock size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {questions.map((q, idx) => (
                <div key={q.id} style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{
                      background: '#E5E7EB',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}>
                      Q{idx + 1} - {q.skill}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>{q.points} pts</span>
                  </div>

                  <p style={{ margin: '0 0 16px', fontSize: '1.05rem', lineHeight: 1.5 }}>
                    {q.question}
                  </p>

                  {q.type === 'mcq' && q.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {q.options.map((opt) => (
                        <label
                          key={opt.label}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            background: answers[q.id] === opt.label ? '#EEF2FF' : '#F9FAFB',
                            border: answers[q.id] === opt.label ? '2px solid #4F46E5' : '2px solid transparent',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt.label}
                            checked={answers[q.id] === opt.label}
                            onChange={() => handleAnswerChange(q.id, opt.label)}
                            style={{ width: '18px', height: '18px' }}
                          />
                          <span><strong>{opt.label}.</strong> {opt.text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'short_answer' && (
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Type your answer here..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        resize: 'vertical',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '24px' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: '#4F46E5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  cursor: submitting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                {submitting ? <Loader2 size={24} className="spin" /> : <CheckCircle size={24} />}
                Submit Test
              </button>
            </div>
          </div>
        )}

        {/* Result Stage */}
        {stage === 'result' && result && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: result.passed ? '#10B981' : '#EF4444',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              {result.passed ? <Trophy size={50} /> : <XCircle size={50} />}
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: '2rem' }}>
              {result.passed ? 'Congratulations!' : 'Test Completed'}
            </h2>

            <p style={{ color: '#6B7280', margin: '0 0 24px', fontSize: '1.1rem' }}>
              {result.passed
                ? 'You have passed the assessment!'
                : 'Thank you for taking the assessment.'}
            </p>

            <div style={{
              fontSize: '4rem',
              fontWeight: 700,
              color: result.passed ? '#10B981' : '#EF4444',
              marginBottom: '16px',
            }}>
              {Math.round(result.score)}%
            </div>

            <p style={{ color: '#6B7280', margin: 0 }}>
              {result.earned && `${result.earned} / ${result.total} points`}
            </p>

            {/* Status-specific next steps */}
            {candidate?.status === 'shortlisted' && candidate?.interview_status === 'completed' && (
              <div style={{
                marginTop: '32px',
                padding: '20px',
                background: '#DCFCE7',
                border: '1px solid #10B981',
                borderRadius: '12px',
              }}>
                <h3 style={{ margin: '0 0 12px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={24} /> Interview Completed!
                </h3>
                <p style={{ margin: 0, color: '#166534' }}>
                  Thank you for completing your interview with Arun. Our team will review your interview and get back to you soon.
                </p>
              </div>
            )}

            {candidate?.status === 'shortlisted' && candidate?.interview_status !== 'completed' && (
              <div style={{
                marginTop: '32px',
                padding: '20px',
                background: '#DCFCE7',
                border: '1px solid #10B981',
                borderRadius: '12px',
              }}>
                <h3 style={{ margin: '0 0 12px', color: '#166534' }}>You've been Shortlisted!</h3>
                <p style={{ margin: '0 0 16px', color: '#166534' }}>
                  {candidate?.interview_status
                    ? 'Continue your Level 1 Interview with Arun.'
                    : 'Congratulations! You are now eligible for Level 1 Interview with Arun.'}
                </p>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      // Create or get existing interview via API
                      const res = await walkinApi.startInterview(driveId, candidate.registration_id);
                      // Navigate to interview page with interview ID
                      window.location.href = `/?interview=${res.data.interview_id}`;
                    } catch (err) {
                      setError(err.response?.data?.detail || 'Failed to start interview');
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: loading ? '#9CA3AF' : '#166534',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {loading ? <Loader2 size={18} className="spin" /> : <Phone size={18} />}
                  {loading ? 'Loading...' : (candidate?.interview_status ? 'Resume Interview with Arun' : 'Start Interview with Arun')}
                </button>
              </div>
            )}

            {candidate?.status === 'rejected' && (
              <div style={{
                marginTop: '32px',
                padding: '20px',
                background: '#FEE2E2',
                border: '1px solid #EF4444',
                borderRadius: '12px',
              }}>
                <p style={{ margin: 0, color: '#991B1B' }}>
                  Thank you for participating. Unfortunately, you have not been selected to proceed.
                  We wish you the best in your future endeavors.
                </p>
              </div>
            )}

            {candidate?.status !== 'shortlisted' && candidate?.status !== 'rejected' && (
              <div style={{
                marginTop: '32px',
                padding: '20px',
                background: '#F3F4F6',
                borderRadius: '12px',
              }}>
                <p style={{ margin: 0, color: '#4B5563' }}>
                  {result.passed
                    ? 'Please wait for the HR team to review your results. You will be notified of next steps shortly.'
                    : 'Please check with the HR desk for next steps.'}
                </p>
              </div>
            )}

            {/* Refresh status button */}
            <button
              onClick={async () => {
                try {
                  const res = await walkinApi.lookupCandidate(driveId, { phone });
                  setCandidate(res.data);
                } catch (err) {
                  console.error('Failed to refresh status');
                }
              }}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                color: '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                margin: '16px auto 0',
              }}
            >
              <RefreshCw size={16} /> Check Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
