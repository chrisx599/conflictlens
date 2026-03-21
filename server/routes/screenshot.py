from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from ..llm import chat_json
from ..mineru import upload_and_parse

router = APIRouter()


SCREENSHOT_EXTRACT_SYSTEM = """You are a message extractor. Given raw text (OCR output from a chat screenshot), 
extract the conversation messages in order.

Return JSON:
{
  "messages": [
    {"speaker": "left" or "right", "text": "message content"},
    ...
  ],
  "raw_text": "the cleaned-up full text"
}

Rules:
- "left" = messages on the left side (typically the other person)
- "right" = messages on the right side (typically the user/self)
- Preserve original language
- If you cannot determine speaker sides, use "unknown"
- Extract ALL messages in chronological order"""


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


@router.post("/api/screenshot/upload")
async def upload_screenshot(file: UploadFile = File(...)):
    """Upload a screenshot image, extract messages via MinerU OCR + LLM."""
    contents = await file.read()
    filename = file.filename or "screenshot.png"

    # Use MinerU to OCR the image
    markdown_text = await upload_and_parse(contents, filename, language="ch")

    # Use LLM to extract structured messages from the markdown
    user_prompt = f"""Here is the OCR output from a chat screenshot:

{markdown_text}

Please extract the conversation messages in order."""

    result = chat_json(SCREENSHOT_EXTRACT_SYSTEM, user_prompt)
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
