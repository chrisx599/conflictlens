from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ..llm import chat_json
from ..prompts import SUMMARY_REPORT_SYSTEM

router = APIRouter()


class SummaryRequest(BaseModel):
    scenario: Optional[dict] = None
    assessment: Optional[dict] = None
    dialogue: Optional[dict] = None
    practice: Optional[dict] = None
    language: str = "zh"


@router.post("/api/summary")
async def generate_summary(req: SummaryRequest):
    scenario_text = ""
    if req.scenario:
        scenario_text = f"""Scenario: {req.scenario.get('description', '')}
Self: {req.scenario.get('selfName', '')}
Other: {req.scenario.get('otherName', '')}
Relationship: {req.scenario.get('relationship', '')}"""

    assessment_text = ""
    if req.assessment:
        s = req.assessment.get("self", {})
        o = req.assessment.get("other", {})
        assessment_text = f"""Self style: {s.get('primaryStyle', '')} - {s.get('strengths', '')}
Other style: {o.get('primaryStyle', '')} - {o.get('strengths', '')}"""

    patterns_text = ""
    if req.dialogue and req.dialogue.get("lines"):
        for line in req.dialogue["lines"]:
            if line.get("pattern"):
                patterns_text += f"  - [{line['pattern']}] \"{line.get('text', '')}\"\n"

    practice_text = ""
    if req.practice and req.practice.get("attempts"):
        for a in req.practice["attempts"]:
            practice_text += f"  Original: \"{a.get('original', '')}\"\n"
            practice_text += f"  Rewrite: \"{a.get('rewrite', '')}\"\n"
            practice_text += f"  Score: {a.get('score', 'N/A')}/10\n\n"

    lang_instruction = (
        "Please respond entirely in English."
        if req.language == "en"
        else "请用中文回答。"
    )

    user_prompt = f"""Session data summary:

{scenario_text}

{assessment_text}

Negative patterns identified in dialogue:
{patterns_text}

Practice rewrite attempts:
{practice_text}

{lang_instruction}

Please generate a personalized communication improvement summary report."""

    return chat_json(SUMMARY_REPORT_SYSTEM, user_prompt)
