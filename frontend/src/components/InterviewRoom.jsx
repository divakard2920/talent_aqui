import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, Volume2, User } from 'lucide-react';
import { interviewApi } from '../services/api';

const INTERVIEWER_NAME = "Arun";

export function InterviewRoom({ interview, candidate, job, onComplete, onClose }) {
  const [status, setStatus] = useState('ready'); // ready, starting, active, processing, completed
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [evaluation, setEvaluation] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  // Start the interview
  const startInterview = async () => {
    setStatus('starting');
    setError(null);

    try {
      const res = await interviewApi.start(interview.id);

      // Add AI's opening message to transcript
      setTranscript([{
        role: 'ai',
        content: res.data.ai_message,
        timestamp: new Date().toISOString(),
      }]);

      // Play audio if available
      if (res.data.ai_audio_base64) {
        await playAudio(res.data.ai_audio_base64);
      }

      setStatus('active');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start interview');
      setStatus('ready');
    }
  };

  // Play base64 audio
  const playAudio = async (base64Audio) => {
    return new Promise((resolve, reject) => {
      try {
        setIsSpeaking(true);
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audio.onended = () => {
          setIsSpeaking(false);
          resolve();
        };
        audio.onerror = (e) => {
          setIsSpeaking(false);
          reject(e);
        };
        audio.play();
      } catch (e) {
        setIsSpeaking(false);
        reject(e);
      }
    });
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Could not access microphone. Please allow microphone access.');
    }
  };

  // Stop recording and send to API
  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setStatus('processing');

        // Convert to base64
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];

          try {
            const res = await interviewApi.respond(interview.id, base64Audio);

            // Add candidate's response to transcript
            setTranscript(prev => [...prev, {
              role: 'candidate',
              content: res.data.candidate_transcript,
              timestamp: new Date().toISOString(),
            }]);

            // Add AI's response
            setTranscript(prev => [...prev, {
              role: 'ai',
              content: res.data.ai_message,
              timestamp: new Date().toISOString(),
            }]);

            // Play AI's audio response
            if (res.data.ai_audio_base64) {
              await playAudio(res.data.ai_audio_base64);
            }

            // Check if interview is complete
            if (res.data.is_complete) {
              setStatus('completed');
              // Fetch final evaluation
              const evalRes = await interviewApi.get(interview.id);
              setEvaluation(evalRes.data.evaluation);
              onComplete?.(evalRes.data);
            } else {
              setStatus('active');
            }
          } catch (err) {
            setError(err.response?.data?.detail || 'Failed to process response');
            setStatus('active');
          }

          resolve();
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    });
  };

  // End interview early
  const endInterview = async () => {
    try {
      const res = await interviewApi.end(interview.id);
      setEvaluation(res.data.evaluation);
      setStatus('completed');
      onComplete?.(res.data);
    } catch (err) {
      setError('Failed to end interview');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Render evaluation results
  if (status === 'completed' && evaluation) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: evaluation.overall_score >= 70 ? '#E4F5E9' : evaluation.overall_score >= 50 ? '#FEF3C7' : '#FEE2E2',
            color: evaluation.overall_score >= 70 ? '#287A4F' : evaluation.overall_score >= 50 ? '#92400E' : '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 700,
            margin: '0 auto 16px',
          }}>
            {evaluation.overall_score}
          </div>
          <h3 style={{ margin: '0 0 8px' }}>Screening Complete</h3>
          <span style={{
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: evaluation.recommendation === 'proceed_to_l2' ? '#E4F5E9' : evaluation.recommendation === 'hold' ? '#FEF3C7' : '#FEE2E2',
            color: evaluation.recommendation === 'proceed_to_l2' ? '#287A4F' : evaluation.recommendation === 'hold' ? '#92400E' : '#DC2626',
          }}>
            {evaluation.recommendation === 'proceed_to_l2' ? 'Proceed to L2' : evaluation.recommendation === 'hold' ? 'Hold' : 'Not Recommended'}
          </span>
        </div>

        <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center' }}>
          "{evaluation.summary}"
        </p>

        {/* Score breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Communication', score: evaluation.communication_score },
            { label: 'Technical', score: evaluation.technical_score },
            { label: 'Culture Fit', score: evaluation.culture_fit_score },
            { label: 'Enthusiasm', score: evaluation.enthusiasm_score },
          ].map(item => (
            <div key={item.label} style={{ background: '#F4F4F4', padding: '12px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontWeight: 600 }}>{item.score}</span>
              </div>
              <div style={{ height: '6px', background: '#E5E5E5', borderRadius: '3px' }}>
                <div style={{
                  height: '100%',
                  width: `${item.score}%`,
                  background: item.score >= 70 ? '#287A4F' : item.score >= 50 ? '#F59E0B' : '#DC2626',
                  borderRadius: '3px',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Strengths & Concerns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {evaluation.strengths?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', color: '#287A4F', margin: '0 0 8px' }}>Strengths</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
                {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {evaluation.concerns?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', color: '#DC2626', margin: '0 0 8px' }}>Concerns</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
                {evaluation.concerns.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>

        <button className="btn-sarvam" style={{ width: '100%' }} onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        background: 'linear-gradient(135deg, var(--brand-navy) 0%, #4A7AB8 100%)',
        color: 'white',
        borderRadius: '16px 16px 0 0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>Screening Call with {INTERVIEWER_NAME}</h3>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>
              {candidate?.name} • {job?.title}
            </p>
          </div>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            fontSize: '0.85rem',
          }}>
            {status === 'ready' && 'Ready to Connect'}
            {status === 'starting' && 'Connecting...'}
            {status === 'active' && (isRecording ? 'Recording...' : isSpeaking ? `${INTERVIEWER_NAME} is speaking...` : 'Your turn')}
            {status === 'processing' && 'Processing...'}
            {status === 'completed' && 'Call Ended'}
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        background: '#FAFAFA',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {transcript.length === 0 && status === 'ready' && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--brand-navy)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 600,
              margin: '0 auto 16px',
            }}>A</div>
            <p>Click "Start Call" to connect with {INTERVIEWER_NAME} for your screening.</p>
          </div>
        )}

        {transcript.map((entry, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              flexDirection: entry.role === 'candidate' ? 'row-reverse' : 'row',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: entry.role === 'ai' ? 'var(--brand-navy)' : '#E5E5E5',
              color: entry.role === 'ai' ? 'white' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: entry.role === 'ai' ? '0.9rem' : undefined,
              fontWeight: entry.role === 'ai' ? 600 : undefined,
            }}>
              {entry.role === 'ai' ? 'A' : <User size={18} />}
            </div>
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: entry.role === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
              background: entry.role === 'ai' ? 'white' : 'var(--brand-navy)',
              color: entry.role === 'ai' ? 'var(--text-primary)' : 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {entry.content}
            </div>
          </div>
        ))}

        {(status === 'processing' || status === 'starting') && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--brand-navy)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}>
              A
            </div>
            <div style={{ padding: '12px 16px', background: 'white', borderRadius: '4px 16px 16px 16px' }}>
              <Loader2 size={18} className="spin" />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 20px',
          background: '#FEE2E2',
          color: '#DC2626',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {/* Controls */}
      <div style={{
        padding: '20px',
        background: 'white',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
      }}>
        {status === 'ready' && (
          <button className="btn-sarvam" onClick={startInterview}>
            <Phone size={18} /> Start Call
          </button>
        )}

        {status === 'active' && !isSpeaking && (
          <>
            {!isRecording ? (
              <button
                className="btn-sarvam"
                onClick={startRecording}
                style={{ background: '#287A4F' }}
              >
                <Mic size={18} /> Hold to Speak
              </button>
            ) : (
              <button
                className="btn-sarvam"
                onClick={stopRecording}
                style={{ background: '#DC2626' }}
              >
                <MicOff size={18} /> Release to Send
              </button>
            )}

            <button className="btn-pill" onClick={endInterview}>
              <PhoneOff size={18} /> End Call
            </button>
          </>
        )}

        {status === 'active' && isSpeaking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
            <Volume2 size={24} className="pulse" />
            <span>{INTERVIEWER_NAME} is speaking...</span>
          </div>
        )}

        {(status === 'starting' || status === 'processing') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="spin" />
            <span>{status === 'starting' ? `Connecting to ${INTERVIEWER_NAME}...` : 'Processing...'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
