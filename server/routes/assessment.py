from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from ..llm import chat_json
from ..prompts import STYLE_ASSESSMENT_SYSTEM

router = APIRouter()


class AssessmentRequest(BaseModel):
    scenario: str = ""
    selfName: str = ""
    otherName: str = ""
    relationship: str = ""
    selfAnswers: list = []
    otherAnswers: list = []
    language: str = "zh"

    class Config:
        populate_by_name = True


@router.post("/api/assess")
async def assess_conflict_styles(req: AssessmentRequest):
    lang_instruction = (
        "Please respond entirely in English."
        if req.language == "en"
        else "请用中文回答。"
    )

    user_prompt = f"""Conflict scenario: {req.scenario}

Self ({req.selfName}) quiz answers: {req.selfAnswers}
Other ({req.otherName}) quiz answers: {req.otherAnswers}
Relationship type: {req.relationship}

{lang_instruction}

Please analyze both parties' conflict styles."""

    result = chat_json(STYLE_ASSESSMENT_SYSTEM, user_prompt)
    return result
