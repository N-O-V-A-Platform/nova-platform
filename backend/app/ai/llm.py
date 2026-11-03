import json
from typing import Any, Optional

from openai import AsyncOpenAI

from app.core.config import settings


async def complete_json(system_prompt: str, user_prompt: str, fallback: Any) -> Any:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    clients: list[tuple[AsyncOpenAI, str]] = []
    if settings.NVIDIA_API_KEY:
        clients.append(
            (
                AsyncOpenAI(api_key=settings.NVIDIA_API_KEY, base_url="https://integrate.api.nvidia.com/v1"),
                "nvidia/nemotron-3-ultra-550b-a55b",
            )
        )
    if settings.GROQ_API_KEY:
        clients.append(
            (
                AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1"),
                "llama-3.1-8b-instant",
            )
        )
    if settings.OPENROUTER_API_KEY:
        clients.append(
            (
                AsyncOpenAI(api_key=settings.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1"),
                "meta-llama/llama-3.1-8b-instruct:free",
            )
        )

    for client, model in clients:
        try:
            kwargs: dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 1600,
            }
            if "llama-3" in model:
                kwargs["response_format"] = {"type": "json_object"}
            resp = await client.chat.completions.create(**kwargs)
            content = (resp.choices[0].message.content or "").strip()
            if not content:
                continue
            return json.loads(content)
        except Exception as exc:
            print(f"[llm] {model} failed: {exc}")
            continue
    return fallback
