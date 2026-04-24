"""
Voice Service - Handles Text-to-Speech and Speech-to-Text.

Uses Azure OpenAI's TTS and Whisper for natural voice interactions.
"""

import base64
import tempfile
import os
import time
from openai import AzureOpenAI
from app.config import get_settings

settings = get_settings()


class VoiceService:
    """Handles voice synthesis and recognition."""

    def __init__(self):
        # Initialize Azure OpenAI client
        self.client = None
        self._initialize_client()

        # Voice settings for natural conversation
        self.voice = "nova"  # Options: alloy, echo, fable, onyx, nova, shimmer
        self.speed = 1.0

        # Azure deployment names
        self.tts_deployment = settings.azure_openai_tts_deployment or "tts"
        self.whisper_deployment = settings.azure_openai_whisper_deployment or "whisper"

    def _initialize_client(self):
        """Initialize the Azure OpenAI client."""
        azure_endpoint = settings.azure_openai_endpoint
        azure_key = settings.azure_openai_api_key

        if azure_endpoint and azure_key:
            self.client = AzureOpenAI(
                api_key=azure_key,
                api_version="2024-05-01-preview",  # Version that supports TTS/Whisper
                azure_endpoint=azure_endpoint,
            )
        else:
            raise Exception(
                "Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY."
            )

    def text_to_speech(self, text: str) -> str:
        """
        Convert text to speech using Azure OpenAI TTS.

        Args:
            text: The text to convert to speech

        Returns:
            Base64 encoded audio (MP3 format)
        """
        if not self.client:
            raise Exception("Voice service not initialized. Check Azure OpenAI configuration.")

        try:
            # Azure OpenAI uses deployment name instead of model
            response = self.client.audio.speech.create(
                model=self.tts_deployment,  # Azure deployment name
                voice=self.voice,
                input=text,
                speed=self.speed,
            )

            # Get audio bytes
            audio_bytes = response.content

            # Encode to base64
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

            return audio_base64

        except Exception as e:
            print(f"[VoiceService] TTS error: {e}")
            raise

    def speech_to_text(self, audio_base64: str, max_retries: int = 3) -> str:
        """
        Convert speech to text using Azure OpenAI Whisper.

        Args:
            audio_base64: Base64 encoded audio
            max_retries: Number of retries for rate limit errors

        Returns:
            Transcribed text
        """
        if not self.client:
            raise Exception("Voice service not initialized. Check Azure OpenAI configuration.")

        # Decode base64 to bytes
        audio_bytes = base64.b64decode(audio_base64)

        # Create a temporary file (Whisper API needs a file)
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name

        try:
            for attempt in range(max_retries):
                try:
                    # Transcribe using Azure OpenAI Whisper deployment
                    with open(temp_file_path, "rb") as audio_file:
                        transcript = self.client.audio.transcriptions.create(
                            model=self.whisper_deployment,  # Azure deployment name
                            file=audio_file,
                            language="en",  # Can be made configurable
                        )
                    return transcript.text

                except Exception as e:
                    error_str = str(e).lower()
                    # Check for rate limit error (429)
                    if "429" in str(e) or "rate" in error_str or "limit" in error_str:
                        if attempt < max_retries - 1:
                            wait_time = 20 * (attempt + 1)  # 20s, 40s, 60s
                            print(f"[VoiceService] Rate limited, waiting {wait_time}s before retry...")
                            time.sleep(wait_time)
                            continue
                    print(f"[VoiceService] STT error: {e}")
                    raise

        finally:
            # Clean up temp file
            os.unlink(temp_file_path)

    def set_voice(self, voice: str):
        """
        Set the TTS voice.

        Options: alloy, echo, fable, onyx, nova, shimmer
        - alloy: Neutral, balanced
        - echo: Male, warm
        - fable: British, narrative
        - onyx: Deep, authoritative
        - nova: Female, warm, conversational (recommended)
        - shimmer: Female, clear, professional
        """
        valid_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        if voice in valid_voices:
            self.voice = voice
        else:
            raise ValueError(f"Invalid voice. Choose from: {valid_voices}")

    def set_speed(self, speed: float):
        """Set speech speed (0.25 to 4.0, default 1.0)."""
        if 0.25 <= speed <= 4.0:
            self.speed = speed
        else:
            raise ValueError("Speed must be between 0.25 and 4.0")


# Singleton instance
voice_service = VoiceService()
