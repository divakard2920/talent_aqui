"""
Azure Speech Service - Handles Text-to-Speech and Speech-to-Text using Azure Cognitive Services.

Uses DefaultAzureCredential for authentication.
"""

import base64
import tempfile
import os
import azure.cognitiveservices.speech as speechsdk
from azure.identity import DefaultAzureCredential
from app.config import get_settings

settings = get_settings()


class AzureSpeechService:
    """Handles voice synthesis and recognition using Azure Speech Service."""

    def __init__(self):
        self.endpoint = settings.azure_speech_endpoint
        if not self.endpoint:
            raise Exception("Azure Speech endpoint not configured. Set AZURE_SPEECH_ENDPOINT.")

        # Extract region from endpoint (e.g., https://swedencentral.api.cognitive.microsoft.com/)
        self.region = self._extract_region_from_endpoint(self.endpoint)

        # Get token using DefaultAzureCredential
        self.credential = DefaultAzureCredential()

        # Voice settings
        self.voice_name = "en-US-GuyNeural"  # Male voice, similar to "echo"
        self.speech_rate = "+0%"

    def _extract_region_from_endpoint(self, endpoint: str) -> str:
        """Extract region from endpoint URL."""
        # https://swedencentral.api.cognitive.microsoft.com/ -> swedencentral
        endpoint = endpoint.rstrip("/")
        if "api.cognitive.microsoft.com" in endpoint:
            parts = endpoint.replace("https://", "").split(".")
            return parts[0]
        raise ValueError(f"Could not extract region from endpoint: {endpoint}")

    def _get_speech_config(self) -> speechsdk.SpeechConfig:
        """Get speech config with AAD token authentication."""
        # Get access token
        token = self.credential.get_token("https://cognitiveservices.azure.com/.default")

        # Create speech config with authorization token
        speech_config = speechsdk.SpeechConfig(
            auth_token=f"aad#{self.endpoint}#{token.token}",
            region=self.region
        )
        return speech_config

    def text_to_speech(self, text: str) -> str:
        """
        Convert text to speech using Azure Speech Service.

        Args:
            text: The text to convert to speech

        Returns:
            Base64 encoded audio (MP3 format)
        """
        speech_config = self._get_speech_config()
        speech_config.speech_synthesis_voice_name = self.voice_name
        speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
        )

        # Synthesize to memory
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

        # Apply speech rate using SSML
        ssml = f"""
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
            <voice name="{self.voice_name}">
                <prosody rate="{self.speech_rate}">
                    {text}
                </prosody>
            </voice>
        </speak>
        """

        result = synthesizer.speak_ssml_async(ssml).get()

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            audio_bytes = result.audio_data
            return base64.b64encode(audio_bytes).decode('utf-8')
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            raise Exception(f"Speech synthesis canceled: {cancellation.reason}. Error: {cancellation.error_details}")
        else:
            raise Exception(f"Speech synthesis failed: {result.reason}")

    def speech_to_text(self, audio_base64: str) -> str:
        """
        Convert speech to text using Azure Speech Service.

        Args:
            audio_base64: Base64 encoded audio

        Returns:
            Transcribed text
        """
        speech_config = self._get_speech_config()
        speech_config.speech_recognition_language = "en-US"

        # Decode base64 to bytes
        audio_bytes = base64.b64decode(audio_base64)

        # Write to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name

        try:
            # Create audio config from file
            audio_config = speechsdk.AudioConfig(filename=temp_file_path)

            # Create recognizer
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=speech_config,
                audio_config=audio_config
            )

            # Recognize
            result = recognizer.recognize_once()

            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                return result.text
            elif result.reason == speechsdk.ResultReason.NoMatch:
                return ""
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = result.cancellation_details
                raise Exception(f"Speech recognition canceled: {cancellation.reason}. Error: {cancellation.error_details}")
            else:
                raise Exception(f"Speech recognition failed: {result.reason}")

        finally:
            os.unlink(temp_file_path)

    def listen_from_microphone(self, timeout_seconds: int = 15) -> str:
        """
        Listen from server's default microphone and convert to text.

        This bypasses browser microphone permissions - captures audio directly
        from the server's microphone using Azure Speech SDK.

        Args:
            timeout_seconds: How long to listen before timing out

        Returns:
            Transcribed text from microphone
        """
        speech_config = self._get_speech_config()
        speech_config.speech_recognition_language = "en-US"

        # Use default microphone on the server
        audio_config = speechsdk.AudioConfig(use_default_microphone=True)

        # Create recognizer
        recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            audio_config=audio_config
        )

        print("[AzureSpeech] Listening from microphone...")

        # Recognize once (listens until silence is detected)
        result = recognizer.recognize_once()

        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            print(f"[AzureSpeech] Recognized: {result.text}")
            return result.text
        elif result.reason == speechsdk.ResultReason.NoMatch:
            print("[AzureSpeech] No speech detected")
            return ""
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            print(f"[AzureSpeech] Canceled: {cancellation.reason}")
            if cancellation.reason == speechsdk.CancellationReason.Error:
                raise Exception(f"Speech recognition error: {cancellation.error_details}")
            return ""
        else:
            raise Exception(f"Speech recognition failed: {result.reason}")

    def set_voice(self, voice: str):
        """
        Set the TTS voice.

        Common Azure Neural voices:
        - en-US-GuyNeural: Male, conversational
        - en-US-JennyNeural: Female, conversational
        - en-US-AriaNeural: Female, professional
        - en-GB-RyanNeural: British male
        """
        self.voice_name = voice

    def set_speed(self, speed: float):
        """Set speech speed (0.5 to 2.0, default 1.0)."""
        if 0.5 <= speed <= 2.0:
            # Convert to percentage: 1.0 = +0%, 1.5 = +50%, 0.5 = -50%
            percentage = int((speed - 1.0) * 100)
            self.speech_rate = f"{percentage:+d}%"
        else:
            raise ValueError("Speed must be between 0.5 and 2.0")


# Singleton instance (only created if Azure Speech is enabled)
azure_speech_service = None

def get_azure_speech_service():
    global azure_speech_service
    if azure_speech_service is None:
        azure_speech_service = AzureSpeechService()
    return azure_speech_service
