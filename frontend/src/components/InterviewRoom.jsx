import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, Volume2, User, Send, MessageSquare } from 'lucide-react';
import { interviewApi } from '../services/api';

export function InterviewRoom({ interview, candidate, job, onComplete, onClose }) {
  const [status, setStatus] = useState('ready'); // ready, starting, active, processing, completed
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [useTextMode, setUseTextMode] = useState(false); // Fallback for no mic access
  const [textInput, setTextInput] = useState('');
  const [micError, setMicError] = useState(false);
  const [serverMicAvailable, setServerMicAvailable] = useState(false); // Server-side mic via Azure Speech
  const [useServerMic, setUseServerMic] = useState(false); // Using server mic instead of browser mic
  const [isListening, setIsListening] = useState(false); // Server mic listening state
  const [voiceLiveAvailable, setVoiceLiveAvailable] = useState(false); // VoiceLive real-time streaming
  const [voiceLiveMode, setVoiceLiveMode] = useState(false); // Currently using VoiceLive
  const [interviewerName, setInterviewerName] = useState('Sage'); // Configurable interviewer name
  const [aiSpeaking, setAiSpeaking] = useState(false); // Track when AI is speaking in VoiceLive

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const textInputRef = useRef(null);
  const pollingRef = useRef(null);
  const lastAiMessageCountRef = useRef(0); // Track AI message count for animation
  const aiSpeakingTimeoutRef = useRef(null);

  // Fetch config on mount to check available modes
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await interviewApi.getConfig();
        setServerMicAvailable(res.data.server_mic_available);
        setVoiceLiveAvailable(res.data.voicelive_available);
        if (res.data.interviewer_name) {
          setInterviewerName(res.data.interviewer_name);
        }
      } catch (err) {
        console.log('Could not fetch interview config:', err.message);
      }
    };
    fetchConfig();
  }, []);

  // Poll for transcript updates in VoiceLive mode
  useEffect(() => {
    if (voiceLiveMode && (status === 'active' || status === 'processing')) {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await interviewApi.get(interview.id);
          if (res.data.transcript && res.data.transcript.length > 0) {
            const newTranscript = res.data.transcript.map(t => ({
              role: t.role === 'assistant' ? 'ai' : 'candidate',
              content: t.content,
              timestamp: t.timestamp,
            }));

            // Check if new AI message arrived - trigger speaking animation
            const aiMessages = newTranscript.filter(t => t.role === 'ai');
            if (aiMessages.length > lastAiMessageCountRef.current) {
              lastAiMessageCountRef.current = aiMessages.length;
              setAiSpeaking(true);
              // Clear any existing timeout
              if (aiSpeakingTimeoutRef.current) {
                clearTimeout(aiSpeakingTimeoutRef.current);
              }
              // Stop animation after 3 seconds
              aiSpeakingTimeoutRef.current = setTimeout(() => {
                setAiSpeaking(false);
              }, 3000);
            }

            setTranscript(newTranscript);
          }
          if (res.data.status === 'completed') {
            // Only show completed if evaluation has real scores (not just generated in background)
            if (res.data.evaluation && res.data.evaluation.overall_score !== undefined) {
              setStatus('completed');
              setEvaluation(res.data.evaluation);
              onComplete?.(res.data);
              clearInterval(pollingRef.current);
            } else {
              // Still waiting for evaluation - keep polling
              setStatus('processing');
            }
          }
        } catch (err) {
          console.log('Polling error:', err.message);
        }
      }, 2000);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (aiSpeakingTimeoutRef.current) clearTimeout(aiSpeakingTimeoutRef.current);
      };
    }
  }, [voiceLiveMode, status, interview.id, onComplete]);

  // Prevent browser refresh/close during active interview
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (status === 'active' || status === 'processing' || status === 'starting') {
        e.preventDefault();
        e.returnValue = 'Interview in progress. Are you sure you want to leave? Your progress will be lost.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  // Fullscreen helpers
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }
    } catch (err) {
      console.log('Fullscreen not available:', err.message);
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    } catch (err) {
      console.log('Exit fullscreen failed:', err);
    }
  };

  // Exit fullscreen when interview completes
  useEffect(() => {
    if (status === 'completed') {
      exitFullscreen();
    }
  }, [status]);

  // Start the interview
  const startInterview = async () => {
    // Enter fullscreen immediately on user click
    await enterFullscreen();

    setStatus('starting');
    setError(null);

    // Use VoiceLive if available (real-time streaming)
    if (voiceLiveAvailable) {
      try {
        await interviewApi.startVoiceLive(interview.id);
        setVoiceLiveMode(true);
        setStatus('active');
        // AI will greet - show speaking animation
        setAiSpeaking(true);
        aiSpeakingTimeoutRef.current = setTimeout(() => setAiSpeaking(false), 4000);
        // Transcript will be updated via polling
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to start VoiceLive interview');
        setStatus('ready');
        exitFullscreen();
      }
      return;
    }

    // Standard interview mode
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
      exitFullscreen(); // Exit fullscreen if start failed
    }
  };

  // Stop VoiceLive interview
  const stopVoiceLive = async () => {
    try {
      await interviewApi.stopVoiceLive(interview.id);
      // Polling will detect completion
    } catch (err) {
      setError('Failed to stop interview');
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

  // Start recording (browser mic)
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
      setMicError(true);
      // If server mic is available (Azure Speech Service enabled), use it instead of text mode
      if (serverMicAvailable) {
        setUseServerMic(true);
        setError('Browser mic blocked. Using server microphone instead.');
      } else {
        setUseTextMode(true);
        setError('Microphone not available. Switched to text mode.');
      }
    }
  };

  // Use server-side microphone (Azure Speech Service)
  const useServerMicrophone = async () => {
    if (status !== 'active' || isSpeaking) return;

    setIsListening(true);
    setError(null);
    setStatus('processing');

    try {
      const res = await interviewApi.respondMic(interview.id);

      // If no speech detected
      if (!res.data.candidate_transcript) {
        setError('No speech detected. Please try again.');
        setStatus('active');
        setIsListening(false);
        return;
      }

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
        const evalRes = await interviewApi.get(interview.id);
        setEvaluation(evalRes.data.evaluation);
        onComplete?.(evalRes.data);
      } else {
        setStatus('active');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to capture audio from server mic');
      setStatus('active');
    } finally {
      setIsListening(false);
    }
  };

  // Send text response (fallback for no mic)
  const sendTextResponse = async () => {
    if (!textInput.trim() || status !== 'active') return;

    const text = textInput.trim();
    setTextInput('');
    setStatus('processing');

    try {
      const res = await interviewApi.respondText(interview.id, text);

      // Add candidate's response to transcript
      setTranscript(prev => [...prev, {
        role: 'candidate',
        content: text,
        timestamp: new Date().toISOString(),
      }]);

      // Add Devin's response
      setTranscript(prev => [...prev, {
        role: 'ai',
        content: res.data.ai_message,
        timestamp: new Date().toISOString(),
      }]);

      // Check if interview is complete
      if (res.data.is_complete) {
        setStatus('completed');
        const evalRes = await interviewApi.get(interview.id);
        setEvaluation(evalRes.data.evaluation);
        onComplete?.(evalRes.data);
      } else {
        setStatus('active');
        // Focus back on input
        setTimeout(() => textInputRef.current?.focus(), 100);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send response');
      setStatus('active');
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

  // Show loading while evaluation is being generated
  if (status === 'processing' && voiceLiveMode) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Loader2 size={48} className="spin" style={{ margin: '40px auto', color: 'var(--brand-navy)' }} />
        <h3>Generating Evaluation...</h3>
        <p style={{ color: 'var(--text-muted)' }}>Please wait while we analyze the interview.</p>
      </div>
    );
  }

  // Render evaluation results
  if (status === 'completed' && evaluation) {
    const isIncomplete = evaluation.incomplete === true && evaluation.overall_score === 0;

    // Show incomplete/no-response state
    if (isIncomplete) {
      return (
        <div style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              margin: '0 auto 16px',
            }}>
              !
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Incomplete Screening</h3>
            <span style={{
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: '#FEE2E2',
              color: '#DC2626',
            }}>
              Unable to Evaluate
            </span>
          </div>

          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0, color: '#991B1B', fontSize: '0.9rem' }}>
              {evaluation.summary || "The candidate did not provide enough responses during the screening call to generate a meaningful evaluation."}
            </p>
          </div>

          {evaluation.concerns?.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#DC2626', margin: '0 0 8px' }}>Issues</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {evaluation.concerns.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Consider rescheduling the screening call or reaching out to the candidate to understand if there were technical issues.
          </p>

          <button className="btn-sarvam" style={{ width: '100%' }} onClick={onClose}>
            Close
          </button>
        </div>
      );
    }

    // Normal evaluation display
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
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>Screening Call with {interviewerName}</h3>
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
            {status === 'ready' && (voiceLiveAvailable ? 'Ready (VoiceLive)' : 'Ready to Connect')}
            {status === 'starting' && 'Connecting...'}
            {status === 'active' && voiceLiveMode && 'Live Conversation'}
            {status === 'active' && !voiceLiveMode && (isRecording ? 'Recording...' : isListening ? 'Listening (Server)...' : isSpeaking ? `${interviewerName} is speaking...` : 'Your turn')}
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
            }}>{interviewerName.charAt(0)}</div>
            <p>Click "Start Call" to connect with {interviewerName} for your screening.</p>
          </div>
        )}

        {/* VoiceLive Call UI - Simple avatar with waves when speaking */}
        {status === 'active' && voiceLiveMode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            minHeight: '300px',
          }}>
            <div style={{ position: 'relative' }}>
              {/* Audio wave rings - show when speaking */}
              {aiSpeaking && (
                <>
                  <div className="audio-wave-ring" style={{
                    position: 'absolute',
                    inset: '-12px',
                    borderRadius: '50%',
                    border: '3px solid #287A4F',
                    animation: 'pulse-ring 1.5s ease-out infinite',
                  }} />
                  <div className="audio-wave-ring" style={{
                    position: 'absolute',
                    inset: '-24px',
                    borderRadius: '50%',
                    border: '2px solid #287A4F',
                    animation: 'pulse-ring 1.5s ease-out infinite 0.3s',
                  }} />
                  <div className="audio-wave-ring" style={{
                    position: 'absolute',
                    inset: '-36px',
                    borderRadius: '50%',
                    border: '1px solid #287A4F',
                    animation: 'pulse-ring 1.5s ease-out infinite 0.6s',
                  }} />
                </>
              )}
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand-navy) 0%, #1a365d 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                fontWeight: 600,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              }}>
                {interviewerName.charAt(0)}
              </div>
            </div>
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
              {entry.role === 'ai' ? interviewerName.charAt(0) : <User size={18} />}
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
      }}>
        {/* Mode toggle - hide in VoiceLive mode */}
        {status === 'active' && !isSpeaking && !isListening && !voiceLiveMode && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <button
              onClick={() => { setUseTextMode(false); setUseServerMic(false); }}
              style={{
                padding: '6px 16px',
                borderRadius: '20px 0 0 20px',
                border: '1px solid var(--border-strong)',
                background: !useTextMode && !useServerMic ? 'var(--brand-navy)' : 'white',
                color: !useTextMode && !useServerMic ? 'white' : 'var(--text-primary)',
                fontSize: '0.8rem',
                cursor: micError ? 'not-allowed' : 'pointer',
                opacity: micError ? 0.5 : 1,
              }}
              disabled={micError}
            >
              <Mic size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Voice
            </button>
            {serverMicAvailable && (
              <button
                onClick={() => { setUseServerMic(true); setUseTextMode(false); }}
                style={{
                  padding: '6px 16px',
                  border: '1px solid var(--border-strong)',
                  borderLeft: 'none',
                  background: useServerMic ? 'var(--brand-navy)' : 'white',
                  color: useServerMic ? 'white' : 'var(--text-primary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <Mic size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Server Mic
              </button>
            )}
            <button
              onClick={() => { setUseTextMode(true); setUseServerMic(false); }}
              style={{
                padding: '6px 16px',
                borderRadius: serverMicAvailable ? '0' : '0 20px 20px 0',
                border: '1px solid var(--border-strong)',
                borderLeft: 'none',
                background: useTextMode ? 'var(--brand-navy)' : 'white',
                color: useTextMode ? 'white' : 'var(--text-primary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                ...(serverMicAvailable ? { borderRadius: '0 20px 20px 0' } : {}),
              }}
            >
              <MessageSquare size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Text
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          {status === 'ready' && (
            <button className="btn-sarvam" onClick={startInterview}>
              <Phone size={18} /> Start Call {voiceLiveAvailable && '(VoiceLive)'}
            </button>
          )}

          {/* VoiceLive mode - real-time streaming, no manual controls needed */}
          {status === 'active' && voiceLiveMode && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#287A4F' }}>
                <Volume2 size={24} className="pulse" />
                <span style={{ fontWeight: 500 }}>Live Conversation in Progress</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Speak naturally into the microphone. The conversation flows automatically.
              </p>
              <button className="btn-pill" onClick={stopVoiceLive} style={{ marginTop: '8px' }}>
                <PhoneOff size={18} /> End Call
              </button>
            </div>
          )}

          {status === 'active' && !isSpeaking && !useTextMode && !useServerMic && !voiceLiveMode && (
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

          {status === 'active' && !isSpeaking && useServerMic && !isListening && (
            <>
              <button
                className="btn-sarvam"
                onClick={useServerMicrophone}
                style={{ background: '#287A4F' }}
              >
                <Mic size={18} /> Click to Speak (Server Mic)
              </button>
              <button className="btn-pill" onClick={endInterview}>
                <PhoneOff size={18} /> End Call
              </button>
            </>
          )}

          {status === 'active' && isListening && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
              <Mic size={24} className="pulse" style={{ color: '#DC2626' }} />
              <span>Listening... Speak now</span>
            </div>
          )}

          {status === 'active' && !isSpeaking && useTextMode && (
            <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
              <input
                ref={textInputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendTextResponse()}
                placeholder="Type your response..."
                className="input-elegant"
                style={{ flex: 1, padding: '12px 20px' }}
                autoFocus
              />
              <button
                className="btn-sarvam"
                onClick={sendTextResponse}
                disabled={!textInput.trim()}
                style={{ padding: '12px 20px' }}
              >
                <Send size={18} />
              </button>
              <button className="btn-pill" onClick={endInterview}>
                <PhoneOff size={18} />
              </button>
            </div>
          )}

          {status === 'active' && isSpeaking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
              <Volume2 size={24} className="pulse" />
              <span>{interviewerName} is speaking...</span>
            </div>
          )}

          {(status === 'starting' || status === 'processing') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="spin" />
              <span>{status === 'starting' ? `Connecting to ${interviewerName}...` : 'Processing...'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
