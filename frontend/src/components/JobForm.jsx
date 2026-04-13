import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const initialState = {
  title: '',
  description: '',
  requirements: '',
  department: '',
  location: '',
  employment_type: 'Permanent',
  experience_min_years: 0,
  experience_max_years: 5,
  skills_required: '',
  skills_preferred: '',
  salary_min: '',
  salary_max: '',
};

export function JobForm({ onSubmit, loading, initialData = null, buttonText = 'Create Job' }) {
  const [form, setForm] = useState(initialData || initialState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      ...form,
      experience_min_years: parseInt(form.experience_min_years) || 0,
      experience_max_years: parseInt(form.experience_max_years) || null,
      salary_min: parseInt(form.salary_min) || null,
      salary_max: parseInt(form.salary_max) || null,
      skills_required: form.skills_required
        ? form.skills_required.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      skills_preferred: form.skills_preferred
        ? form.skills_preferred.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    };

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <label style={labelStyle}>Job Title *</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="e.g., Senior AI Engineer"
          required
          className="input-elegant"
          style={{ borderRadius: '12px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Department</label>
          <input
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder="e.g., Engineering"
            className="input-elegant"
            style={{ borderRadius: '12px' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g., Chennai"
            className="input-elegant"
            style={{ borderRadius: '12px' }}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Description *</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe the role and responsibilities..."
          required
          rows={4}
          style={textareaStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Requirements *</label>
        <textarea
          name="requirements"
          value={form.requirements}
          onChange={handleChange}
          placeholder="List the key requirements for this role..."
          required
          rows={3}
          style={textareaStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Employment Type</label>
          <select
            name="employment_type"
            value={form.employment_type}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="Permanent">Permanent</option>
            <option value="Contract">Contract</option>
            <option value="Part-time">Part-time</option>
            <option value="Internship">Internship</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Min Exp (yrs)</label>
          <input
            name="experience_min_years"
            type="number"
            min="0"
            value={form.experience_min_years}
            onChange={handleChange}
            className="input-elegant"
            style={{ borderRadius: '12px' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Max Exp (yrs)</label>
          <input
            name="experience_max_years"
            type="number"
            min="0"
            value={form.experience_max_years}
            onChange={handleChange}
            className="input-elegant"
            style={{ borderRadius: '12px' }}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Required Skills (comma separated)</label>
        <input
          name="skills_required"
          value={form.skills_required}
          onChange={handleChange}
          placeholder="e.g., Python, LangChain, Azure OpenAI"
          className="input-elegant"
          style={{ borderRadius: '12px' }}
        />
      </div>

      <div>
        <label style={labelStyle}>Preferred Skills (comma separated)</label>
        <input
          name="skills_preferred"
          value={form.skills_preferred}
          onChange={handleChange}
          placeholder="e.g., Docker, Kubernetes"
          className="input-elegant"
          style={{ borderRadius: '12px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Min Salary</label>
          <input
            name="salary_min"
            type="number"
            value={form.salary_min}
            onChange={handleChange}
            placeholder="e.g., 2000000"
            className="input-elegant"
            style={{ borderRadius: '12px' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Max Salary</label>
          <input
            name="salary_max"
            type="number"
            value={form.salary_max}
            onChange={handleChange}
            placeholder="e.g., 2500000"
            className="input-elegant"
            style={{ borderRadius: '12px' }}
          />
        </div>
      </div>

      <button type="submit" className="btn-sarvam" disabled={loading} style={{ marginTop: '8px' }}>
        {loading ? <Loader2 size={18} className="spin" /> : null}
        {loading ? 'Saving...' : buttonText}
      </button>
    </form>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
};

const textareaStyle = {
  width: '100%',
  padding: '14px 18px',
  borderRadius: '12px',
  border: '1px solid var(--border-strong)',
  fontFamily: 'var(--font-sans)',
  fontSize: '1rem',
  resize: 'vertical',
  background: 'rgba(255, 255, 255, 0.5)',
};

const selectStyle = {
  width: '100%',
  padding: '16px 24px',
  borderRadius: '12px',
  border: '1px solid var(--border-strong)',
  fontFamily: 'var(--font-sans)',
  fontSize: '1rem',
  background: 'rgba(255, 255, 255, 0.5)',
  cursor: 'pointer',
  height: '56px',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234A4A4A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
};
