import mimetypes
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from ..llm import chat_vision_json, chat_json

router = APIRouter()


VISION_EXTRACT_SYSTEM = """You are a chat message extractor. You will receive a screenshot of a chat conversation (e.g. WeChat, WhatsApp, iMessage, etc.).

Your task is to extract ALL messages visible in the screenshot, in chronological order (top to bottom).

Return valid JSON in this exact shape:
{
  "messages": [
    {"speaker": "left" | "right", "text": "<message content>"},
    ...
  ],
  "raw_text": "<all messages joined as plain text, one per line>"
}

Rules:
- "right" = messages on the RIGHT side (bubble aligned to the right, often in green/blue/colored background) — this is typically the user/self
- "left"  = messages on the LEFT side (bubble aligned to the left, often in white/grey background) — this is typically the other person
- Extract EVERY message, including very short ones like "好的", "嗯", "哦", "拜拜", "ok", etc.
- For sticker / emoji images that contain readable text (e.g. a sticker with the word "哦" on it), include that text.
- For pure image stickers with no text, write "[贴纸]" (or "[sticker]" for English conversations).
- Preserve the original language exactly.
- Do NOT skip any messages, even if they seem short or unimportant.
- Do NOT merge separate messages into one."""


PARTNER_ESTIMATION_SYSTEM = """You are a relationship psychologist specializing in the Romantic Partner Conflict Scale (RPCS).

Based on the conflict scenario description, estimate how the OTHER person (the partner) would answer the 13-item RPCS questionnaire.

The 13 items map to 6 subscales:
- Compromise (items 1-2): Willingness to find middle ground
- Domination (items 3-4): Tendency to control/dominate
- Submission (items 5-6): Tendency to give in
- Separation (items 7-8): Tendency to withdraw physically/emotionally
- Avoidance (items 9-10): Tendency to avoid the issue
- Interactional Reactivity (items 11-13): Emotional reactivity during conflict

Return JSON:
{
  "estimatedAnswers": [1-5, 1-5, ...],  // array of 13 integers, each 1-5
  "reasoning": "Brief explanation of why you estimated these answers based on the scenario"
}

Each answer is on a 1-5 Likert scale (1=Strongly Disagree, 5=Strongly Agree)."""


def _guess_media_type(filename: str, content_type: str | None) -> str:
    """Best-effort media type for the uploaded image."""
    if content_type and content_type.startswith("image/"):
        return content_type
    guessed, _ = mimetypes.guess_type(filename)
    if guessed and guessed.startswith("image/"):
        return guessed
    return "image/png"


@router.post("/api/screenshot/upload")
async def upload_screenshot(file: UploadFile = File(...)):
    """Upload a chat screenshot and extract all messages using Vision LLM."""
    contents = await file.read()
    filename = file.filename or "screenshot.png"
    media_type = _guess_media_type(filename, file.content_type)

    user_prompt = (
        "Please extract every chat message visible in this screenshot, "
        "following the JSON format described in the system prompt."
    )

    result = chat_vision_json(
        VISION_EXTRACT_SYSTEM,
        user_prompt,
        image_bytes=contents,
        image_media_type=media_type,
    )
    return result


class EstimateRequest(BaseModel):
    scenario: str = ""
    selfName: str = ""
    otherName: str = ""
    relationship: str = ""
    selfAnswers: list = []
    language: str = "zh"


@router.post("/api/assess/estimate")
async def estimate_partner_answers(req: EstimateRequest):
    """Estimate the partner's questionnaire answers from the conflict scenario."""
    lang_instruction = (
        "Please respond entirely in English."
        if req.language == "en"
        else "请用中文回答。"
    )

    user_prompt = f"""Conflict scenario: {req.scenario}

Self ({req.selfName}) quiz answers (1-5 Likert): {req.selfAnswers}
Partner name: {req.otherName}
Relationship type: {req.relationship}

{lang_instruction}

Based on this scenario, estimate how {req.otherName} would answer the 13-item RPCS questionnaire."""

    result = chat_json(PARTNER_ESTIMATION_SYSTEM, user_prompt)
    return result
