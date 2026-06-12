import httpx
from typing import Optional

OLLAMA_BASE = "http://localhost:11434"
DEFAULT_MODEL = "llama3.1:8b"


class LLMClient:
    def __init__(self, model: str = DEFAULT_MODEL, base_url: str = OLLAMA_BASE):
        self.model = model
        self.base_url = base_url

    def generate(self, prompt: str, system: Optional[str] = None) -> str:
        payload: dict = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system:
            payload["system"] = system

        try:
            resp = httpx.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=60.0,
            )
            resp.raise_for_status()
            return resp.json().get("response", "").strip()
        except httpx.HTTPError as e:
            raise RuntimeError(f"LLM request failed: {e}") from e

    def is_available(self) -> bool:
        try:
            httpx.get(f"{self.base_url}/api/tags", timeout=3.0).raise_for_status()
            return True
        except httpx.HTTPError:
            return False


# Prompt templates

IMPACT_EXTRACTION = """\
You are a career coach helping an engineer articulate their work as high-signal impact.

Raw task entry: "{task}"

Rewrite this as one concise sentence that focuses on outcome and impact, not just activity.
Start with an action verb. Be specific. Do not invent details not implied by the input.
Return only the rewritten sentence, nothing else."""

SIGNAL_CLASSIFICATION = """\
Classify the following engineering task into exactly one of these signal types:
- execution: completing concrete deliverables or shipping code
- ownership: taking end-to-end responsibility unprompted
- influence: shaping decisions, unblocking others, or cross-team coordination
- risk: preventing failure, reducing toil, or improving reliability
- clarity: resolving ambiguity, creating structure, or documenting decisions
- leverage: multiplying others' output through mentorship, tooling, or process

Task: "{task}"

Reply with only the signal type word, nothing else."""

REFLECTION_COACH = """\
You are an experienced engineering career coach. Given this task entry, generate one short, \
specific follow-up question that would help the engineer capture the deeper impact or \
context while it's still fresh. Ask about who was affected, what risk was reduced, \
whether it unblocked someone, or why it mattered strategically.

Task: "{task}"

Return only the question, nothing else."""

PRIORITY_ALIGNMENT = """\
Given a list of declared priorities and actual tasks completed today, identify any \
mismatches. Be specific and concise.

Declared priorities:
{priorities}

Actual tasks completed:
{tasks}

List up to 3 specific misalignments or gaps. If none, say "Alignment looks good."
Keep your response under 100 words."""

WEEKLY_SYNTHESIS = """\
You are helping an engineer synthesize their week into two short paragraphs.

Daily entries from this week:
{entries}

Declared priorities (P0/P1/P2):
{priorities}

Respond using EXACTLY this format with no deviation — do not add headers, intros, or extra text:

WHAT_LANDED:
[2-3 sentences on the most impactful work completed this week. Focus on outcomes, not activities.]

WHAT_DRIFTED:
[2-3 sentences on misalignment, gaps, or unplanned work that crowded out priorities. Be honest and specific.]"""

EVIDENCE_BULLETS = """\
Convert the following weekly work entries into 3-5 promotion-ready bullet points.
Each bullet should start with a strong action verb, describe the outcome and its impact, \
and be suitable for a performance review or promotion packet.
Do not invent details. Draw only from what is given.

Entries:
{entries}

Return a numbered list only, nothing else."""

WEEK_MODE = """\
Based on this week's task data, classify the week as one of:
- focus: high signal work, mostly aligned with declared priorities
- drift: significant time on lower-priority or reactive work
- recovery: week dominated by unplanned or blocking work

Declared priorities: {priorities}
Tasks summary: {tasks_summary}
Unplanned percentage: {unplanned_pct}%

Reply with only one word: focus, drift, or recovery."""


def build_prompt(template: str, **kwargs) -> str:
    return template.format(**kwargs)
