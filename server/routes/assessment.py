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

Self ({req.selfName}) RPCS questionnaire answers (13 items, 1-5 Likert scale): {req.selfAnswers}
Other ({req.otherName}) RPCS questionnaire answers (13 items, 1-5 Likert scale): {req.otherAnswers}
Relationship type: {req.relationship}

Subscale mapping:
- Items 1-2: Compromise
- Items 3-4: Domination
- Items 5-6: Submission
- Items 7-8: Separation
- Items 9-10: Avoidance
- Items 11-13: Interactional Reactivity

{lang_instruction}

Please analyze both parties' conflict styles based on their RPCS scores."""

    result = chat_json(STYLE_ASSESSMENT_SYSTEM, user_prompt)
    return result
