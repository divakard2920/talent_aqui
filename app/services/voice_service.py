"""
Voice Service - Handles Text-to-Speech and Speech-to-Text.

Supports two backends:
1. Azure OpenAI (TTS and Whisper models)
2. Azure Speech Service (when USE_AZURE_SPEECH_SERVICE=true)
"""

import base64
import tempfile
import os
import time
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from app.config import get_settings

settings = get_settings()


class VoiceService:
    """Handles voice synthesis and recognition."""

    def __init__(self):
        # Check if Azure Speech Service should be used
        self.use_azure_speech = settings.use_azure_speech_service

        if self.use_azure_speech:
            # Use Azure Speech Service
            from app.services.azure_speech_service import get_azure_speech_service
            self.azure_speech = get_azure_speech_service()
            self.client = None
        else:
            # Use Azure OpenAI TTS/Whisper
            self.azure_speech = None
            self.client = None
            self._initialize_client()

        # Voice settings for natural conversation
        self.voice = "echo"  # Warm voice for Sage. Options: alloy, echo, fable, onyx, nova, shimmer
        self.speed = 1.0

        # Azure deployment names (for OpenAI mode)
        self.tts_deployment = settings.azure_openai_tts_deployment or "tts"
        self.whisper_deployment = settings.azure_openai_whisper_deployment or "whisper"

    def _initialize_client(self):
        """Initialize the Azure OpenAI client for voice services."""
        # Use voice-specific endpoint if provided, otherwise fall back to main endpoint
        azure_endpoint = settings.azure_openai_voice_endpoint or settings.azure_openai_endpoint

        if not azure_endpoint:
            raise Exception(
                "Azure OpenAI Voice not configured. Set AZURE_OPENAI_VOICE_ENDPOINT or AZURE_OPENAI_ENDPOINT."
            )

        if settings.azure_openai_auth_mode == "aad":
            # Use Azure AD authentication (DefaultAzureCredential)
            credential = DefaultAzureCredential()
            token_provider = get_bearer_token_provider(
                credential, "https://cognitiveservices.azure.com/.default"
            )
            self.client = AzureOpenAI(
                azure_ad_token_provider=token_provider,
                api_version="2025-01-01-preview",  # Version that supports TTS/Whisper
                azure_endpoint=azure_endpoint,
            )
        else:
            # Use API key authentication
            azure_key = settings.azure_openai_api_key
            if not azure_key:
                raise Exception(
                    "Azure OpenAI API key not configured. Set AZURE_OPENAI_API_KEY."
                )
            self.client = AzureOpenAI(
                api_key=azure_key,
                api_version="2025-01-01-preview",  # Version that supports TTS/Whisper
                azure_endpoint=azure_endpoint,
            )

    def text_to_speech(self, text: str) -> str:
        """
        Convert text to speech.

        Args:
            text: The text to convert to speech

        Returns:
            Base64 encoded audio (MP3 format)
        """
        # Use Azure Speech Service if enabled
        if self.use_azure_speech:
            return self.azure_speech.text_to_speech(text)

        # Otherwise use Azure OpenAI TTS
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
        Convert speech to text.

        Args:
            audio_base64: Base64 encoded audio
            max_retries: Number of retries for rate limit errors

        Returns:
            Transcribed text
        """
        # Use Azure Speech Service if enabled
        if self.use_azure_speech:
            return self.azure_speech.speech_to_text(audio_base64)

        # Otherwise use Azure OpenAI Whisper
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

        For OpenAI: alloy, echo, fable, onyx, nova, shimmer
        For Azure Speech: en-US-GuyNeural, en-US-JennyNeural, etc.
        """
        if self.use_azure_speech:
            self.azure_speech.set_voice(voice)
        else:
            valid_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
            if voice in valid_voices:
                self.voice = voice
            else:
                raise ValueError(f"Invalid voice. Choose from: {valid_voices}")

    def set_speed(self, speed: float):
        """Set speech speed (0.5 to 2.0 for Azure Speech, 0.25 to 4.0 for OpenAI)."""
        if self.use_azure_speech:
            self.azure_speech.set_speed(speed)
        else:
            if 0.25 <= speed <= 4.0:
                self.speed = speed
            else:
                raise ValueError("Speed must be between 0.25 and 4.0")

    def listen_from_microphone(self, timeout_seconds: int = 15) -> str:
        """
        Listen from server's microphone directly (bypasses browser).

        Only available when USE_AZURE_SPEECH_SERVICE=true.
        For demo purposes when browser mic permissions are blocked.

        Returns:
            Transcribed text from microphone
        """
        if not self.use_azure_speech:
            raise Exception("Server-side microphone only available with Azure Speech Service. Set USE_AZURE_SPEECH_SERVICE=true")

        return self.azure_speech.listen_from_microphone(timeout_seconds)


# Singleton instance
voice_service = VoiceService()
