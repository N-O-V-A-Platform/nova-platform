"""
N.O.V.A. TTS & Avatar Service — Multi-Provider Audio & Visual Synthesis

Provides text-to-speech audio synthesis:
1. Gemini TTS / Google Cloud TTS (High Quality, Natural Multilingual Output)
2. Edge-TTS / gTTS Fallback
3. Browser Web-Speech API Fallback

Includes voice selection, speech rate, pitch, and avatar stream configuration.
"""

import os
import base64
import asyncio
from typing import Dict, Any, Optional
from app.core.config import settings

class TTSAvatarService:
    def __init__(self):
        # Comprehensive voice presets matching student preferences
        self.voice_presets = {
            "dr_nova": {
                "name": "Dr. Nova (Warm Female)",
                "voices": {
                    "Hinglish": "en-IN-NeerjaNeural",
                    "English": "en-US-AvaNeural",
                    "Hindi": "hi-IN-SwaraNeural"
                },
                "gemini_voice": "Puck",  # Gemini Audio voice preset
                "gender": "female"
            },
            "prof_orion": {
                "name": "Prof. Orion (Authoritative Male)",
                "voices": {
                    "Hinglish": "en-IN-PrabhatNeural",
                    "English": "en-US-AndrewNeural",
                    "Hindi": "hi-IN-MadhurNeural"
                },
                "gemini_voice": "Charon",
                "gender": "male"
            },
            "aria": {
                "name": "Aria (Enthusiastic Tutor)",
                "voices": {
                    "Hinglish": "en-IN-AnanyaNeural",
                    "English": "en-US-EmmaNeural",
                    "Hindi": "hi-IN-KavyanjaliNeural"
                },
                "gemini_voice": "Kore",
                "gender": "female"
            }
        }

    async def generate_speech_audio(
        self,
        text: str,
        language: str = "Hinglish",
        voice_preset: str = "dr_nova",
        speech_rate: float = 1.0
    ) -> Dict[str, Any]:
        """
        Generates TTS audio with multi-provider cascade:
        1. Gemini TTS API / Google GenAI audio (if GEMINI_API_KEY / GOOGLE_API_KEY set)
        2. edge-tts (local free Python package)
        3. Web-Speech API payload fallback
        """
        clean_text = text.replace("*", "").replace("#", "").strip()
        preset = self.voice_presets.get(voice_preset, self.voice_presets["dr_nova"])
        selected_voice = preset["voices"].get(language, preset["voices"]["Hinglish"])

        # ── 1. Try Gemini / Google GenAI Audio Output ─────────────────────────────
        google_api_key = getattr(settings, "GOOGLE_API_KEY", None) or getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
        if google_api_key:
            try:
                # Use Google GenAI SDK or HTTP endpoint for Gemini audio synthesis
                from google import genai
                client = genai.Client(api_key=google_api_key)
                
                # Request speech output from Gemini audio model
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"Read aloud the following text naturally in {language} as an encouraging teacher:\n\n{clean_text}",
                    config={
                        "response_mime_type": "audio/mp3",
                    }
                )
                if hasattr(response, "audio_content") and response.audio_content:
                    b64_audio = base64.b64encode(response.audio_content).decode('utf-8')
                    return {
                        "provider": "gemini-tts",
                        "audio_data_url": f"data:audio/mp3;base64,{b64_audio}",
                        "voice_used": f"Gemini ({preset['name']})",
                        "text": clean_text
                    }
            except Exception as e:
                print(f"[TTSAvatarService] Gemini TTS call fallback: {e}")

        # ── 2. Edge-TTS Fallback ──────────────────────────────────────────────────
        try:
            import edge_tts
            # Map rate multiplier to percentage string e.g. +10% or -10%
            rate_percent = f"{int((speech_rate - 1.0) * 100):+d}%"
            communicate = edge_tts.Communicate(clean_text, selected_voice, rate=rate_percent)
            audio_bytes = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes.extend(chunk["data"])

            if audio_bytes:
                b64_audio = base64.b64encode(audio_bytes).decode('utf-8')
                return {
                    "provider": "edge-tts",
                    "audio_data_url": f"data:audio/mp3;base64,{b64_audio}",
                    "voice_used": f"{preset['name']} ({selected_voice})",
                    "text": clean_text
                }
        except Exception as e:
            print(f"[TTSAvatarService] edge-tts unavailable/failed: {e}")

        # ── 3. Web Speech API Fallback ────────────────────────────────────────────
        return {
            "provider": "web-speech-api",
            "audio_data_url": None,
            "voice_used": preset["name"],
            "text": clean_text
        }

    def get_avatar_payload(self, teacher_name: str = "Dr. Nova", state: str = "speaking") -> Dict[str, Any]:
        """Returns Avatar stream or dynamic SVG payload."""
        did_api_key = os.getenv("DID_API_KEY")
        heygen_api_key = os.getenv("HEYGEN_API_KEY")

        if did_api_key:
            return {
                "avatar_type": "d-id",
                "stream_url": "https://api.d-id.com/talks/demo_stream",
                "state": state
            }
        elif heygen_api_key:
            return {
                "avatar_type": "heygen",
                "stream_url": "https://api.heygen.com/v1/streaming.talk",
                "state": state
            }
        else:
            return {
                "avatar_type": "nova_synthetic_svg",
                "avatar_name": teacher_name,
                "expression": "encouraging" if state == "speaking" else "listening",
                "accent_color": "#6366f1",
                "state": state
            }
