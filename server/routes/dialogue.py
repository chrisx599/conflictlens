from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ..llm import chat_json
from ..prompts import DIALOGUE_GENERATION_SYSTEM

router = APIRouter()


class DialogueGenerateRequest(BaseModel):
    scenario: str = ""
    selfName: str = ""
    otherName: str = ""
    relationship: str = ""
    selfStyle: Optional[dict] = None
    otherStyle: Optional[dict] = None
    language: str = "zh"


class ReflectRequest(BaseModel):
    line: Optional[dict] = None
    reflection: str = ""
    language: str = "zh"


@router.post("/api/dialogue/generate")
async def generate_dialogue(req: DialogueGenerateRequest):
    self_style_text = req.selfStyle.get("primaryStyle", "") if req.selfStyle else ""
    other_style_text = req.otherStyle.get("primaryStyle", "") if req.otherStyle else ""

    lang_instruction = (
        "Please respond entirely in English."
        if req.language == "en"
        else "请用中文回答。"
    )

    user_prompt = f"""Conflict scenario: {req.scenario}

Self ({req.selfName}) conflict style: {self_style_text}
Other ({req.otherName}) conflict style: {other_style_text}
Relationship type: {req.relationship}

{lang_instruction}

Please generate a realistic conflict dialogue for this scenario."""

    result = chat_json(DIALOGUE_GENERATION_SYSTEM, user_prompt)
    return result


@router.post("/api/dialogue/reflect")
async def reflect_on_dialogue(req: ReflectRequest):
    line_text = req.line.get("text", "") if req.line else ""
    pattern = req.line.get("pattern", "") if req.line else ""

    if req.language == "en":
        system = """You are a gentle communication coach. The user is reflecting on a dialogue line containing a negative communication pattern.
Give encouraging feedback on their reflection, helping them understand the pattern more deeply.
Return JSON:
{
  "feedback": "2-3 sentence response to the user's reflection",
  "deeper_insight": "A deeper understanding of this pattern (1-2 sentences)",
  "encouragement": "One encouraging sentence"
}"""
    else:
        system = """你是一位温和的沟通教练。用户正在反思一句包含负面沟通模式的对话。
请对用户的反思给出鼓励性的反馈，帮助他们更深入地理解这个模式。
用 JSON 返回：
{
  "feedback": "对用户反思的2-3句回应",
  "deeper_insight": "对这个模式的更深层理解（1-2句）",
  "encouragement": "一句鼓励的话"
}"""

    user_prompt = f"""Original dialogue: "{line_text}"
Negative pattern: {pattern}
User reflection: {req.reflection}"""

    return chat_json(system, user_prompt)
