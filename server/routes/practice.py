from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ..llm import chat_json
from ..prompts import REWRITE_FEEDBACK_SYSTEM

router = APIRouter()


class RewriteRequest(BaseModel):
    originalText: str = ""
    rewrittenText: str = ""
    pattern: str = ""
    speaker: str = ""
    language: str = "zh"


class HintRequest(BaseModel):
    originalText: str = ""
    pattern: str = ""
    language: str = "zh"


@router.post("/api/practice/rewrite")
async def rewrite_feedback(req: RewriteRequest):
    lang_instruction = (
        "Please respond entirely in English."
        if req.language == "en"
        else "请用中文回答。"
    )

    user_prompt = f"""Original negative statement: "{req.originalText}"
Negative pattern type: {req.pattern}
User's rewritten attempt: "{req.rewrittenText}"
Speaker: {req.speaker}

{lang_instruction}

Please analyze the user's rewrite and give feedback."""

    return chat_json(REWRITE_FEEDBACK_SYSTEM, user_prompt)


@router.post("/api/practice/hint")
async def get_hint(req: HintRequest):
    if req.language == "en":
        system = """You are an NVC (Nonviolent Communication) coach. Give the user a hint for rewriting, without giving the complete answer.
Return JSON:
{
  "hint": "A guiding hint (1-2 sentences)",
  "focus": "Suggested NVC element to focus on (Observation/Feeling/Need/Request)",
  "starter": "A starting word or phrase to help the user begin"
}"""
    else:
        system = """你是一位非暴力沟通教练。给用户一个改写提示，不要直接给出完整答案。
用 JSON 返回：
{
  "hint": "一个引导性的提示（1-2句）",
  "focus": "建议用户聚焦的NVC要素（观察/感受/需要/请求）",
  "starter": "一个开头词或短语，帮助用户起步"
}"""

    user_prompt = f"""Original negative statement: "{req.originalText}"
Negative pattern type: {req.pattern}

Please give a rewrite hint."""

    return chat_json(system, user_prompt)
