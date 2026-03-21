import json
import base64
from openai import OpenAI
from .config import settings


_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
        )
    return _client


def chat(system_prompt: str, user_prompt: str, temperature: float = 1.0) -> str:
    """Send a chat completion request and return the response text."""
    client = get_client()
    response = client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
    )
    return response.choices[0].message.content


def chat_json(system_prompt: str, user_prompt: str, temperature: float = 1.0) -> dict:
    """Send a chat completion and parse JSON from the response."""
    client = get_client()
    response = client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        response_format={"type": "json_object"},
    )
    text = response.choices[0].message.content
    return json.loads(text)


def chat_vision_json(
    system_prompt: str,
    user_prompt: str,
    image_bytes: bytes,
    image_media_type: str = "image/png",
    temperature: float = 1.0,
) -> dict:
    """Send a vision + text prompt and parse JSON from the response.

    The image is base64-encoded and sent inline as a data URL.
    """
    client = get_client()
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{image_media_type};base64,{b64}"

    response = client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                    {"type": "text", "text": user_prompt},
                ],
            },
        ],
        temperature=temperature,
        response_format={"type": "json_object"},
    )
    text = response.choices[0].message.content
    return json.loads(text)
