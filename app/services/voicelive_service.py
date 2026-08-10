"""
VoiceLive Interview Service - Real-time streaming voice interviews using Azure VoiceLive SDK.

Provides natural, human-like voice conversations with:
- Continuous audio streaming (no click-to-speak)
- Automatic voice activity detection (VAD)
- Real-time AI responses
- Interrupt handling (candidate can interrupt AI)
"""

import asyncio
import base64
import queue
import threading
import logging
from typing import Optional, Callable
from datetime import datetime

try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False
    pyaudio = None

from azure.identity import DefaultAzureCredential

from app.config import get_settings
from app.services.interview_engine import InterviewEngine

settings = get_settings()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class AudioProcessor:
    """Handles real-time audio capture and playback."""

    def __init__(self, connection):
        self.connection = connection
        self.audio = pyaudio.PyAudio() if PYAUDIO_AVAILABLE else None

        self.format = pyaudio.paInt16 if PYAUDIO_AVAILABLE else None
        self.channels = 1
        self.rate = 24000
        self.chunk_size = 1024

        self.is_capturing = False
        self.is_playing = False
        self.input_stream = None
        self.output_stream = None

        self.audio_queue: "queue.Queue[bytes]" = queue.Queue()
        self.audio_send_queue: "queue.Queue[str]" = queue.Queue()
        self.capture_thread: Optional[threading.Thread] = None
        self.playback_thread: Optional[threading.Thread] = None
        self.send_thread: Optional[threading.Thread] = None
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    async def start_capture(self):
        if not PYAUDIO_AVAILABLE:
            raise Exception("PyAudio not installed. Run: pip install pyaudio")

        if self.is_capturing:
            return

        self.loop = asyncio.get_event_loop()
        self.is_capturing = True

        try:
            self.input_stream = self.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.rate,
                input=True,
                frames_per_buffer=self.chunk_size,
            )
            self.input_stream.start_stream()

            self.capture_thread = threading.Thread(target=self._capture_audio_thread)
            self.capture_thread.daemon = True
            self.capture_thread.start()

            self.send_thread = threading.Thread(target=self._send_audio_thread)
            self.send_thread.daemon = True
            self.send_thread.start()

            logger.info("Started audio capture")

        except Exception as e:
            logger.error(f"Failed to start audio capture: {e}")
            self.is_capturing = False
            raise

    def _capture_audio_thread(self):
        while self.is_capturing and self.input_stream:
            try:
                audio_data = self.input_stream.read(self.chunk_size, exception_on_overflow=False)
                if audio_data and self.is_capturing:
                    audio_base64 = base64.b64encode(audio_data).decode("utf-8")
                    self.audio_send_queue.put(audio_base64)
            except Exception as e:
                if self.is_capturing:
                    logger.error(f"Error in audio capture: {e}")
                break

    def _send_audio_thread(self):
        while self.is_capturing:
            try:
                audio_base64 = self.audio_send_queue.get(timeout=0.1)
                if audio_base64 and self.is_capturing and self.loop:
                    asyncio.run_coroutine_threadsafe(
                        self.connection.input_audio_buffer.append(audio=audio_base64),
                        self.loop
                    )
            except queue.Empty:
                continue
            except Exception as e:
                if self.is_capturing:
                    logger.error(f"Error sending audio: {e}")
                break

    async def stop_capture(self):
        if not self.is_capturing:
            return

        self.is_capturing = False

        if self.input_stream:
            self.input_stream.stop_stream()
            self.input_stream.close()
            self.input_stream = None

        if self.capture_thread:
            self.capture_thread.join(timeout=1.0)
        if self.send_thread:
            self.send_thread.join(timeout=1.0)

        while not self.audio_send_queue.empty():
            try:
                self.audio_send_queue.get_nowait()
            except queue.Empty:
                break

        logger.info("Stopped audio capture")

    async def start_playback(self):
        if not PYAUDIO_AVAILABLE:
            raise Exception("PyAudio not installed")

        if self.is_playing:
            return

        self.is_playing = True

        try:
            self.output_stream = self.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.rate,
                output=True,
                frames_per_buffer=self.chunk_size,
            )

            self.playback_thread = threading.Thread(target=self._playback_audio_thread)
            self.playback_thread.daemon = True
            self.playback_thread.start()

            logger.info("Audio playback ready")

        except Exception as e:
            logger.error(f"Failed to initialize playback: {e}")
            self.is_playing = False
            raise

    def _playback_audio_thread(self):
        while self.is_playing:
            try:
                audio_data = self.audio_queue.get(timeout=0.1)
                if audio_data and self.output_stream and self.is_playing:
                    self.output_stream.write(audio_data)
            except queue.Empty:
                continue
            except Exception as e:
                if self.is_playing:
                    logger.error(f"Error in playback: {e}")
                break

    async def queue_audio(self, audio_data: bytes):
        if self.is_playing:
            self.audio_queue.put(audio_data)

    async def stop_playback(self):
        if not self.is_playing:
            return

        self.is_playing = False

        while not self.audio_queue.empty():
            try:
                self.audio_queue.get_nowait()
            except queue.Empty:
                break

        if self.output_stream:
            self.output_stream.stop_stream()
            self.output_stream.close()
            self.output_stream = None

        if self.playback_thread:
            self.playback_thread.join(timeout=1.0)

        logger.info("Stopped playback")

    async def cleanup(self):
        await self.stop_capture()
        await self.stop_playback()
        if self.audio:
            self.audio.terminate()
        logger.info("Audio processor cleaned up")


class VoiceLiveInterview:
    """
    Real-time voice interview using Azure VoiceLive SDK.
    Uses the same system prompt as InterviewEngine for consistency.
    """

    def __init__(
        self,
        job_context: dict,
        candidate_context: dict,
        company_name: str = "Knorr-Bremse",
        on_transcript_update: Optional[Callable] = None,
        on_interview_complete: Optional[Callable] = None,
    ):
        self.job_context = job_context
        self.candidate_context = candidate_context
        self.company_name = company_name
        self.on_transcript_update = on_transcript_update
        self.on_interview_complete = on_interview_complete

        # Use InterviewEngine to get the same system prompt
        self.interview_engine = InterviewEngine()
        self.interview_engine.initialize(
            job=job_context,
            candidate=candidate_context,
            company_name=company_name,
        )

        # VoiceLive endpoint - SDK adds its own path, just provide base URL
        self.endpoint = settings.azure_openai_endpoint.rstrip("/")
        # Convert to WebSocket URL
        self.endpoint = self.endpoint.replace("https://", "wss://").replace("http://", "ws://")

        self.model = settings.voicelive_model or "gpt-4o-realtime-preview"
        self.voice = settings.voicelive_voice or "en-US-AvaNeural"

        # State
        self.connection = None
        self.audio_processor: Optional[AudioProcessor] = None
        self.is_running = False
        self.transcript: list[dict] = []
        self.current_ai_response = ""
        self.candidate_responses = 0
        self.should_end = False

    def get_instructions(self) -> str:
        """Get the system instructions from InterviewEngine."""
        return self.interview_engine.get_system_prompt()

    def _check_if_interview_ending(self, ai_response: str) -> bool:
        """Use LLM to check if the AI's response indicates interview is ending."""
        from app.services.azure_openai import azure_openai_service

        try:
            result = azure_openai_service.chat_completion(
                messages=[
                    {"role": "system", "content": "You analyze interview transcripts. Reply only 'YES' or 'NO'."},
                    {"role": "user", "content": f"Does this interviewer response indicate the interview is ending/wrapping up (saying goodbye, mentioning next steps, thanking for time, etc.)?\n\nResponse: \"{ai_response}\""},
                ],
                temperature=0,
                max_tokens=5,
            )
            return "YES" in result.upper()
        except Exception as e:
            logger.error(f"Error checking interview end: {e}")
            return False

    async def start(self):
        """Start the VoiceLive interview session."""
        try:
            from azure.ai.voicelive.aio import connect
            from azure.ai.voicelive.models import (
                RequestSession,
                ServerVad,
                AzureStandardVoice,
                Modality,
                OutputAudioFormat,
                ServerEventType,
                InputAudioTranscription,
            )
        except ImportError:
            raise Exception("azure-ai-voicelive not installed. Run: pip install azure-ai-voicelive")

        if not PYAUDIO_AVAILABLE:
            raise Exception("pyaudio not installed. Run: pip install pyaudio")

        self.is_running = True
        credential = DefaultAzureCredential()

        logger.info(f"Connecting to VoiceLive at {self.endpoint}")

        try:
            async with connect(
                endpoint=self.endpoint,
                credential=credential,
                model=self.model,
                connection_options={
                    "max_msg_size": 10 * 1024 * 1024,
                    "heartbeat": 20,
                    "timeout": 20,
                },
            ) as connection:
                self.connection = connection
                self.audio_processor = AudioProcessor(connection)

                # Configure session with same instructions as InterviewEngine
                voice_config = AzureStandardVoice(name=self.voice, type="azure-standard")
                # VAD settings - higher threshold = less sensitive to background noise
                # Longer silence_duration = waits longer before ending turn
                turn_detection = ServerVad(
                    threshold=0.8,  # Less sensitive (0.5 was too sensitive)
                    prefix_padding_ms=500,  # Buffer before speech
                    silence_duration_ms=1000,  # Wait 1 second of silence before ending turn
                )

                # Enable input audio transcription to get candidate's speech as text
                input_transcription = InputAudioTranscription(model="whisper-1")

                session_config = RequestSession(
                    modalities=[Modality.TEXT, Modality.AUDIO],
                    instructions=self.get_instructions(),
                    voice=voice_config,
                    input_audio_format=OutputAudioFormat.PCM16,
                    output_audio_format=OutputAudioFormat.PCM16,
                    turn_detection=turn_detection,
                    input_audio_transcription=input_transcription,
                )

                await connection.session.update(session=session_config)
                await self.audio_processor.start_playback()

                logger.info("VoiceLive interview session ready")
                print("\n" + "=" * 60)
                print("INTERVIEW STARTED")
                print(f"Candidate: {self.candidate_context.get('name', 'Unknown')}")
                print(f"Position: {self.job_context.get('title', 'Unknown')}")
                print("=" * 60 + "\n")

                await self._process_events(connection, ServerEventType)

        except Exception as e:
            logger.error(f"VoiceLive connection error: {e}")
            raise
        finally:
            if self.audio_processor:
                await self.audio_processor.cleanup()
            self.is_running = False

    async def _process_events(self, connection, ServerEventType):
        """Process VoiceLive events."""
        try:
            async for event in connection:
                if not self.is_running:
                    break
                await self._handle_event(event, connection, ServerEventType)
        except Exception as e:
            logger.error(f"Event processing error: {e}")
            raise

    async def _handle_event(self, event, connection, ServerEventType):
        """Handle VoiceLive events."""
        # Log all event types for debugging
        logger.debug(f"Event received: {event.type}")

        if event.type == ServerEventType.SESSION_UPDATED:
            logger.info(f"Session ready: {event.session.id}")
            await self.audio_processor.start_capture()

        elif event.type == ServerEventType.INPUT_AUDIO_BUFFER_SPEECH_STARTED:
            logger.info("Candidate started speaking")
            print("\n[Candidate speaking...]")
            await self.audio_processor.stop_playback()
            try:
                await connection.response.cancel()
            except:
                pass

        elif event.type == ServerEventType.INPUT_AUDIO_BUFFER_SPEECH_STOPPED:
            logger.info("Candidate stopped speaking")
            await self.audio_processor.start_playback()

        elif event.type == ServerEventType.CONVERSATION_ITEM_CREATED:
            # Check if this contains user input
            if hasattr(event, 'item') and event.item:
                item = event.item
                if hasattr(item, 'role') and item.role == 'user':
                    # Try to get content
                    content_text = None
                    if hasattr(item, 'content') and item.content:
                        for part in item.content:
                            if hasattr(part, 'transcript'):
                                content_text = part.transcript
                            elif hasattr(part, 'text'):
                                content_text = part.text
                    if content_text:
                        logger.info(f"User input from CONVERSATION_ITEM_CREATED: {content_text[:100]}")
                        # Don't add here - wait for transcription complete event

        elif event.type == ServerEventType.RESPONSE_AUDIO_DELTA:
            await self.audio_processor.queue_audio(event.delta)

        elif event.type == ServerEventType.RESPONSE_AUDIO_TRANSCRIPT_DELTA:
            if hasattr(event, 'delta') and event.delta:
                self.current_ai_response += event.delta
                print(event.delta, end="", flush=True)

        elif event.type == ServerEventType.RESPONSE_AUDIO_TRANSCRIPT_DONE:
            if self.current_ai_response:
                self.transcript.append({
                    "role": "assistant",
                    "content": self.current_ai_response,
                    "timestamp": datetime.utcnow().isoformat(),
                })
                if self.on_transcript_update:
                    self.on_transcript_update(self.transcript)

                # Check if interview should end based on AI's response
                if self._check_if_interview_ending(self.current_ai_response):
                    logger.info("Interview ending detected from AI response")
                    self.should_end = True

                self.current_ai_response = ""
                print()

        elif event.type == ServerEventType.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED:
            # Try different attribute names for the transcription
            transcript_text = None
            if hasattr(event, 'transcript') and event.transcript:
                transcript_text = event.transcript
            elif hasattr(event, 'text') and event.text:
                transcript_text = event.text
            elif hasattr(event, 'transcription') and event.transcription:
                transcript_text = event.transcription
            elif hasattr(event, 'content_part') and event.content_part:
                if hasattr(event.content_part, 'transcript'):
                    transcript_text = event.content_part.transcript
                elif hasattr(event.content_part, 'text'):
                    transcript_text = event.content_part.text

            # Log the event for debugging
            logger.info(f"Transcription event received. Attributes: {dir(event)}")

            if transcript_text:
                print(f"\n[Candidate]: {transcript_text}")
                self.transcript.append({
                    "role": "user",
                    "content": transcript_text,
                    "timestamp": datetime.utcnow().isoformat(),
                })
                self.candidate_responses += 1
                if self.on_transcript_update:
                    self.on_transcript_update(self.transcript)
            else:
                logger.warning(f"Transcription event has no text. Event: {event}")

        elif event.type == ServerEventType.RESPONSE_DONE:
            logger.info("Response complete")
            # Check if interview should end
            if self.should_end or self.candidate_responses >= 15:
                reason = "closing detected" if self.should_end else "max exchanges"
                logger.info(f"Interview complete - {reason}")
                self.is_running = False
                if self.on_interview_complete:
                    self.on_interview_complete(self.transcript)

        elif event.type == ServerEventType.ERROR:
            logger.error(f"VoiceLive error: {event.error.message}")
            print(f"\n[Error]: {event.error.message}")

        else:
            # Log unhandled events that might contain useful data
            event_name = str(event.type).split('.')[-1] if hasattr(event.type, '__str__') else str(event.type)
            if 'INPUT' in event_name.upper() or 'TRANSCRIPT' in event_name.upper() or 'SPEECH' in event_name.upper():
                logger.info(f"Unhandled speech-related event: {event.type}, attrs: {dir(event)}")

    async def stop(self):
        """Stop the interview immediately."""
        logger.info("Stopping interview...")
        self.is_running = False
        self.should_end = True

        # Stop audio immediately without waiting
        if self.audio_processor:
            self.audio_processor.is_capturing = False
            self.audio_processor.is_playing = False
            # Don't await cleanup - let it happen in background
            try:
                if self.audio_processor.input_stream:
                    self.audio_processor.input_stream.stop_stream()
                if self.audio_processor.output_stream:
                    self.audio_processor.output_stream.stop_stream()
            except:
                pass

        logger.info("Interview stopped")

    def get_transcript(self) -> list[dict]:
        """Get the conversation transcript."""
        return self.transcript

    def generate_evaluation(self) -> dict:
        """Generate evaluation using InterviewEngine's logic."""
        logger.info(f"Generating evaluation. Transcript entries: {len(self.transcript)}")

        if not self.transcript:
            logger.warning("No transcript available for evaluation")
            return {
                "overall_score": 0,
                "communication_score": 0,
                "technical_score": 0,
                "culture_fit_score": 0,
                "enthusiasm_score": 0,
                "recommendation": "reject",
                "summary": "No conversation recorded.",
                "strengths": [],
                "concerns": ["No transcript available"],
                "key_highlights": [],
                "suggested_l2_questions": [],
                "incomplete": True,
            }

        # Transfer transcript to interview engine (convert roles if needed)
        self.interview_engine.conversation_history = [
            {
                "role": "assistant" if t["role"] in ["ai", "assistant"] else "user",
                "content": t["content"],
                "timestamp": t.get("timestamp", ""),
            }
            for t in self.transcript
        ]
        self.interview_engine.candidate_responses = [
            t["content"] for t in self.transcript if t["role"] in ["user", "candidate"]
        ]

        logger.info(f"Candidate responses count: {len(self.interview_engine.candidate_responses)}")
        logger.info(f"Conversation history count: {len(self.interview_engine.conversation_history)}")

        evaluation = self.interview_engine.generate_evaluation()
        logger.info(f"Evaluation generated. Score: {evaluation.get('overall_score')}, Recommendation: {evaluation.get('recommendation')}")

        return evaluation


def check_audio_devices() -> dict:
    """Check available audio devices."""
    if not PYAUDIO_AVAILABLE:
        return {"available": False, "error": "PyAudio not installed"}

    try:
        p = pyaudio.PyAudio()
        input_devices = []
        output_devices = []

        for i in range(p.get_device_count()):
            info = p.get_device_info_by_index(i)
            if info.get("maxInputChannels", 0) > 0:
                input_devices.append(info.get("name"))
            if info.get("maxOutputChannels", 0) > 0:
                output_devices.append(info.get("name"))

        p.terminate()

        return {
            "available": len(input_devices) > 0 and len(output_devices) > 0,
            "input_devices": input_devices,
            "output_devices": output_devices,
        }
    except Exception as e:
        return {"available": False, "error": str(e)}
