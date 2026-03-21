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
    annotationResults: Optional[dict] = None
    practice: Optional[dict] = None
    roleplayHistory: Optional[list] = None
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
        assessment_text = f"""Self style: {s.get('primaryStyle', '')} - {s.get('description', '')}
Other style: {o.get('primaryStyle', '')} - {o.get('description', '')}"""

    patterns_text = ""
    if req.dialogue and req.dialogue.get("lines"):
        for line in req.dialogue["lines"]:
            if line.get("pattern"):
                patterns_text += f"  - [{line['pattern']}] \"{line.get('text', '')}\"\n"

    annotation_text = ""
    if req.annotationResults:
        annotation_text = f"""Annotation accuracy: {req.annotationResults.get('accuracy', 'N/A')}%
Correct: {req.annotationResults.get('correct', 0)} / {req.annotationResults.get('total', 0)}"""

    practice_text = ""
    if req.practice and req.practice.get("attempts"):
        for a in req.practice["attempts"]:
            practice_text += f"  Original: \"{a.get('original', '')}\"\n"
            practice_text += f"  Rewrite: \"{a.get('rewrite', '')}\"\n"
            fb = a.get('feedback', {})
            practice_text += f"  Score: {fb.get('score', 'N/A')}/10\n\n"

    roleplay_text = ""
    if req.roleplayHistory:
        recent = req.roleplayHistory[-10:]
        for msg in recent:
            roleplay_text += f"  {msg.get('speaker', '?')}: {msg.get('text', '')}\n"

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

Annotation performance:
{annotation_text}

Practice rewrite attempts:
{practice_text}

Roleplay conversation:
{roleplay_text}

{lang_instruction}

Please generate a personalized communication improvement summary report. Include insights from annotation performance in your recommendations."""

    return chat_json(SUMMARY_REPORT_SYSTEM, user_prompt)
