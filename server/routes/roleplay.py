from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from ..llm import chat_json
from ..prompts import ROLEPLAY_PARTNER_SYSTEM, REALTIME_REWRITE_SYSTEM

router = APIRouter()


class RoleplayRequest(BaseModel):
    scenario: str = ""
    selfName: str = ""
    otherName: str = ""
    otherStyle: Optional[dict] = None
    dialogueHistory: list = []
    userMessage: str = ""
    language: str = "zh"


class SuggestRewriteRequest(BaseModel):
    draft: str = ""
    context: str = ""
    language: str = "zh"


@router.post("/api/practice/roleplay")
async def roleplay_turn(req: RoleplayRequest):
    """Simulate the partner's response in a roleplay conversation."""
    other_style = req.otherStyle.get("primaryStyle", "") if req.otherStyle else ""

    lang_instruction = (
        "Please respond entirely in English."
        if req.language == "en"
        else "请用中文回答。"
    )

    history_text = "\n".join(
        [f"{msg['speaker']}: {msg['text']}" for msg in req.dialogueHistory[-10:]]
    )

    user_prompt = f"""Conflict scenario: {req.scenario}

Partner name: {req.otherName}
Partner conflict style: {other_style}

Dialogue history:
{history_text}

Latest message from {req.selfName}: {req.userMessage}

{lang_instruction}

Please respond as {req.otherName}, staying consistent with their conflict style. If {req.selfName} communicates healthily, gradually become more receptive."""

    result = chat_json(ROLEPLAY_PARTNER_SYSTEM, user_prompt)
    return result


@router.post("/api/practice/suggest-rewrite")
async def suggest_rewrite(req: SuggestRewriteRequest):
    """Provide real-time improvement suggestions for a draft message."""
    lang_instruction = (
        "Please respond entirely in English."
        if req.language == "en"
        else "请用中文回答。"
    )

    user_prompt = f"""Conversation context: {req.context}

User's draft message: {req.draft}

{lang_instruction}

Provide gentle improvement suggestions without giving the complete answer."""

    result = chat_json(REALTIME_REWRITE_SYSTEM, user_prompt)
    return result
