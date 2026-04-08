from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict
from ..llm import chat_json
from ..prompts import DIALOGUE_GENERATION_SYSTEM, DIALOGUE_ANNOTATION_SYSTEM

router = APIRouter()

BEHAVIOR_TYPES = [
    "criticism", "contempt", "defensiveness", "stonewalling",
    "blaming", "invalidation", "mind_reading",
    "overgeneralizing", "demanding", "passive_aggression", "interrupting",
]

BEHAVIOR_ALIASES = {
    "none": None,
    "null": None,
    "critic": "criticism",
    "defensive": "defensiveness",
    "passive aggression": "passive_aggression",
}


def normalize_behavior_label(value):
    if value is None:
        return None

    normalized = str(value).strip().lower()
    if not normalized:
        return None

    normalized = BEHAVIOR_ALIASES.get(normalized, normalized)
    if normalized in BEHAVIOR_TYPES:
        return normalized
    return None


def normalize_dialogue_line(line):
    return {
        "speaker": str(line.get("speaker", "") or ""),
        "text": str(line.get("text", "") or ""),
        "pattern": normalize_behavior_label(line.get("pattern") or line.get("pattern_type") or line.get("pattern_label")),
        "explanation": str(line.get("explanation", "") or line.get("pattern_explanation", "") or ""),
    }


def normalize_dialogue_payload(payload):
    raw_lines = payload.get("lines")
    if not isinstance(raw_lines, list):
        raw_lines = payload.get("dialogue")
    if not isinstance(raw_lines, list):
        raw_lines = []

    return {
        "lines": [normalize_dialogue_line(line) for line in raw_lines if isinstance(line, dict)],
        "overallAnalysis": str(payload.get("overallAnalysis", "") or payload.get("overall_analysis", "") or ""),
        "recommendedResetPoints": payload.get("recommendedResetPoints", []) or [],
    }


def needs_annotation_fallback(lines):
    if not lines:
        return False

    labeled_count = sum(1 for line in lines if line.get("pattern"))
    # If the model labeled nothing, or barely labeled anything in a clearly
    # conflict-heavy dialogue, run a dedicated annotation pass.
    return labeled_count == 0 or labeled_count < max(2, len(lines) // 5)


def annotate_dialogue_lines(lines, language):
    lang_instruction = (
        "Please respond entirely in English."
        if language == "en"
        else "请用中文回答。"
    )

    numbered_lines = "\n".join(
        f'{idx}. {line.get("speaker", "")}: {line.get("text", "")}'
        for idx, line in enumerate(lines)
    )

    user_prompt = f"""Dialogue lines:
{numbered_lines}

{lang_instruction}

Please annotate each line with the most relevant behavior label or null."""

    result = chat_json(DIALOGUE_ANNOTATION_SYSTEM, user_prompt, temperature=0.2)
    annotated_payload = normalize_dialogue_payload(result)
    annotated_lines = annotated_payload["lines"]

    if len(annotated_lines) != len(lines):
        return lines

    merged_lines = []
    for original, annotated in zip(lines, annotated_lines):
        merged_lines.append({
            "speaker": original.get("speaker", "") or annotated.get("speaker", ""),
            "text": original.get("text", "") or annotated.get("text", ""),
            "pattern": annotated.get("pattern"),
            "explanation": annotated.get("explanation", ""),
        })
    return merged_lines


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


class AnnotationCheckRequest(BaseModel):
    lines: list = []           # all dialogue lines from LLM
    userAnnotations: dict = {} # { "0": "criticism", "3": null, ... }
    language: str = "zh"


class AnnotationSummaryRequest(BaseModel):
    lines: list = []
    userAnnotations: dict = {}
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

Use "{req.selfName}" and "{req.otherName}" as the speaker names.

{lang_instruction}

Please generate a realistic conflict dialogue (12-15 turns) for this scenario. Label each line with one of the 11 behavior types or null."""

    result = chat_json(DIALOGUE_GENERATION_SYSTEM, user_prompt)
    normalized = normalize_dialogue_payload(result)

    if needs_annotation_fallback(normalized["lines"]):
        normalized["lines"] = annotate_dialogue_lines(normalized["lines"], req.language)

    return normalized


@router.post("/api/dialogue/reflect")
async def reflect_on_dialogue(req: ReflectRequest):
    line_text = req.line.get("text", "") if req.line else ""
    pattern = req.line.get("pattern", "") if req.line else ""

    if req.language == "en":
        system = """You are a gentle communication coach. The user is reflecting on a dialogue line.
Give encouraging feedback on their reflection.
Return JSON:
{
  "feedback": "2-3 sentence response",
  "deeper_insight": "1-2 sentence deeper understanding",
  "encouragement": "One encouraging sentence"
}"""
    else:
        system = """你是一位温和的沟通教练。用户正在反思一段对话。
请对用户的反思给出鼓励性的反馈。
用 JSON 返回：
{
  "feedback": "对用户反思的2-3句回应",
  "deeper_insight": "更深层理解（1-2句）",
  "encouragement": "一句鼓励的话"
}"""

    user_prompt = f"""Original dialogue: "{line_text}"
Negative pattern: {pattern}
User reflection: {req.reflection}"""

    return chat_json(system, user_prompt)


@router.post("/api/dialogue/check-annotation")
async def check_annotations(req: AnnotationCheckRequest):
    """Compare user annotations against AI ground-truth labels, return per-line accuracy."""
    results = []
    correct = 0
    total = 0

    for idx, line in enumerate(req.lines):
        idx_str = str(idx)
        ai_label = line.get("pattern")
        user_label = req.userAnnotations.get(idx_str)

        # Normalize
        ai_norm = normalize_behavior_label(ai_label)
        user_norm = normalize_behavior_label(user_label)

        is_correct = ai_norm == user_norm
        if is_correct:
            correct += 1
        total += 1

        results.append({
            "index": idx,
            "aiLabel": ai_norm,
            "userLabel": user_norm,
            "correct": is_correct,
            "explanation": line.get("explanation", ""),
        })

    accuracy = round((correct / total * 100) if total > 0 else 0)
    return {"results": results, "accuracy": accuracy, "correct": correct, "total": total}


@router.post("/api/dialogue/annotation-summary")
async def annotation_summary(req: AnnotationSummaryRequest):
    """Generate a summary of the user's annotation performance."""
    # Build comparison data
    comparisons = []
    for idx, line in enumerate(req.lines):
        idx_str = str(idx)
        ai_label = normalize_behavior_label(line.get("pattern"))
        user_label = normalize_behavior_label(req.userAnnotations.get(idx_str))
        comparisons.append({
            "line": line.get("text", ""),
            "speaker": line.get("speaker", ""),
            "ai_label": ai_label,
            "user_label": user_label,
            "correct": ai_label == user_label,
        })

    lang_instruction = (
        "Please respond entirely in English."
        if req.language == "en"
        else "请用中文回答。"
    )

    system = """You are a communication education specialist. Analyze the user's annotation performance and provide a summary.

Return JSON:
{
  "overall": "1-2 sentence overall assessment",
  "strengths": ["Behavior types the user correctly identified (list behavior names)"],
  "weaknesses": ["Behavior types the user missed or confused (list behavior names with brief explanation)"],
  "recommendations": ["1-2 specific tips for improvement"]
}"""

    user_prompt = f"""Annotation comparison data:
{comparisons}

{lang_instruction}

Please analyze the user's annotation performance."""

    result = chat_json(system, user_prompt)
    return result
