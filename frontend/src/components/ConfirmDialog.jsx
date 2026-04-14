import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  loading = false,
}) {
  if (!isOpen) return null;

  const icons = {
    warning: <AlertTriangle size={28} />,
    danger: <AlertTriangle size={28} />,
    info: <HelpCircle size={28} />,
  };

  const colors = {
    warning: { bg: '#FEF3C7', color: '#92400E', btnBg: '#F59E0B' },
    danger: { bg: '#FEE2E2', color: '#DC2626', btnBg: '#DC2626' },
    info: { bg: '#E0E7FF', color: '#4338CA', btnBg: '#4F46E5' },
  };

  const style = colors[type] || colors.warning;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
          padding: '20px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '400px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: style.bg,
                color: style.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icons[type]}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--text-muted)',
                borderRadius: '8px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px 24px 24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 600 }}>{title}</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>

          {/* Actions */}
          <div style={{ padding: '0 24px 24px', display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid var(--border-strong)',
                background: 'white',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: style.btnBg,
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Please wait...' : confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
