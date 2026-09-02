"""
N.O.V.A. AI Teacher Agent — Adaptive Educator & Misconception Engine

Implements:
1. Dynamic Lesson Planner (grounded in RAG context)
2. Interactive Section Script & Visual Generator (SVG specs)
3. Adaptive Misconception Evaluator Loop (detects flaws & switches strategy)
"""

import json
import re
from typing import Dict, List, Optional, Any, Tuple
from openai import AsyncOpenAI
from app.core.config import settings
from app.ai.rag_service import RAGService


class AITeacherAgent:
    def __init__(self):
        self.rag_service = RAGService()
        
        self.use_nvidia = bool(settings.NVIDIA_API_KEY)
        self.use_groq = bool(settings.GROQ_API_KEY)
        self.use_openrouter = bool(settings.OPENROUTER_API_KEY)

        if self.use_nvidia:
            self.nvidia_client = AsyncOpenAI(
                api_key=settings.NVIDIA_API_KEY,
                base_url="https://integrate.api.nvidia.com/v1"
            )
        if self.use_groq:
            self.groq_client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1"
            )
        if self.use_openrouter:
            self.openrouter_client = AsyncOpenAI(
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1"
            )

    async def _call_llm(self, system_prompt: str, user_prompt: str, json_mode: bool = True) -> str:
        """Call LLM with fallback cascade."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        clients = []
        if self.use_nvidia:
            clients.append((self.nvidia_client, "nvidia/nemotron-3-ultra-550b-a55b"))
        if self.use_groq:
            clients.append((self.groq_client, "llama-3.1-8b-instant"))
        if self.use_openrouter:
            clients.append((self.openrouter_client, "meta-llama/llama-3.1-8b-instruct:free"))

        for client, model in clients:
            try:
                kwargs = {
                    "model": model,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 1200,
                }
                if json_mode and "llama-3" in model:
                    kwargs["response_format"] = {"type": "json_object"}
                
                resp = await client.chat.completions.create(**kwargs)
                content = resp.choices[0].message.content.strip()
                if content:
                    return content
            except Exception as e:
                print(f"[AITeacherAgent] Model {model} failed: {e}")
                continue

        # Mock fallback if no API keys are active or LLMs fail
        return self._get_fallback_json(user_prompt)

    def _get_fallback_json(self, prompt: str) -> str:
        """Safe fallback JSON generator when LLM providers are offline/unreachable."""
        if "lesson plan" in prompt.lower() or "sections" in prompt.lower():
            return json.dumps({
                "overview": "Comprehensive interactive session exploring core concepts with real-world analogies and checks for understanding.",
                "sections": [
                    {"title": "Fundamental Concepts & Definitions", "duration_mins": 3, "key_concepts": ["Basic Definitions", "Core Variables"]},
                    {"title": "The Core Principles & Relationships", "duration_mins": 5, "key_concepts": ["Proportionality", "Key Formula"]},
                    {"title": "Intuitive Real-World Analogy", "duration_mins": 4, "key_concepts": ["Water Pipe Model", "Resistance Effect"]},
                    {"title": "Step-by-Step Worked Example", "duration_mins": 5, "key_concepts": ["Problem Solving", "Unit Calculation"]},
                    {"title": "Interactive Assessment & Synthesis", "duration_mins": 3, "key_concepts": ["Check for Understanding", "Misconception Test"]}
                ]
            })
        elif "evaluat" in prompt.lower() or "misconception" in prompt.lower():
            return json.dumps({
                "is_correct": False,
                "confidence": 0.88,
                "misconception_detected": True,
                "misconception_title": "Inverse Relationship Confusion",
                "misconception_explanation": "The student believes that increasing resistance causes current to increase, confusing inverse proportionality with direct proportionality.",
                "remedy_strategy": "ANALOGY_WATER_PIPE",
                "remedy_script": "Let's pause for a second! Think of current as water flowing through a hose, and resistance as pinching the hose. If you pinch the hose tighter (increase resistance), does MORE water come out, or LESS water?",
                "simplified_question": "If you pinch the water pipe tighter, does the water flow increase or decrease?",
                "visual_spec": {
                    "type": "analogy_pipe",
                    "title": "Water Hose Analogy for Resistance & Current",
                    "nodes": [
                        {"id": "water", "label": "Water Pressure (Voltage)", "color": "#3b82f6"},
                        {"id": "constriction", "label": "Pinch in Hose (Resistance)", "color": "#ef4444"},
                        {"id": "flow", "label": "Flow Rate (Current)", "color": "#10b981"}
                    ],
                    "caption": "Pinching the pipe (higher resistance) reduces the flow rate (lower current)."
                }
            })
        else:
            return json.dumps({
                "teacher_script": "Welcome! Today we are going to explore this fundamental topic step-by-step.",
                "visual_spec": {
                    "type": "diagram",
                    "title": "Core Concept Overview",
                    "nodes": [
                        {"id": "n1", "label": "Input Source", "color": "#3b82f6"},
                        {"id": "n2", "label": "Core Element", "color": "#8b5cf6"},
                        {"id": "n3", "label": "Output Current", "color": "#10b981"}
                    ],
                    "caption": "Interconnection between input voltage and resulting current."
                },
                "question": "What happens to the current when the resistance increases while voltage stays constant?"
            })

    async def generate_lesson_plan(
        self,
        topic: str,
        student_level: str = "Class 10",
        language: str = "Hinglish",
        time_mins: int = 20,
        learning_goal: str = "Master fundamental concepts",
        rag_context: str = ""
    ) -> Dict[str, Any]:
        """Generates a structured, grounded lesson plan."""
        system_prompt = (
            "You are N.O.V.A., an expert AI Teacher. You construct structured, highly interactive lesson plans "
            "tailored to the student's background, language preference, time limit, and learning goals. "
            "Respond ONLY with a valid JSON object containing 'overview' and 'sections' (array of section objects with title, duration_mins, key_concepts)."
        )

        user_prompt = f"""
Topic / Subject: {topic}
Student Target Level: {student_level}
Language: {language}
Available Time: {time_mins} minutes
Learning Goal: {learning_goal}

Relevant Course Material Context:
{rag_context if rag_context else 'General curriculum domain standards apply.'}

Generate a breakdown of 4 to 6 logical lesson sections fitting into {time_mins} minutes.
Format:
{{
  "overview": "Short summary of session goal",
  "sections": [
    {{
      "title": "Section Title",
      "duration_mins": 4,
      "key_concepts": ["concept 1", "concept 2"]
    }}
  ]
}}
"""
        raw_resp = await self._call_llm(system_prompt, user_prompt, json_mode=True)
        try:
            # Extract JSON if markdown codeblocks present
            json_match = re.search(r'\{.*\}', raw_resp, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return json.loads(raw_resp)
        except Exception as e:
            print(f"[AITeacherAgent] Lesson plan JSON parsing failed: {e}")
            return json.loads(self._get_fallback_json("lesson plan"))

    async def generate_section_interaction(
        self,
        section_title: str,
        key_concepts: List[str],
        student_level: str,
        language: str,
        rag_context: str = ""
    ) -> Dict[str, Any]:
        """Generates the teacher script, dynamic visual spec, check question, and RAG citations."""
        system_prompt = f"""You are N.O.V.A., an engaging AI Educator.
Language to use: {language} (e.g. if Hinglish, blend Hindi & English naturally like a friendly Indian tutor; if English, clear & conversational).
Target Level: {student_level}

Your output MUST be valid JSON with keys:
1. "teacher_script": Clear, friendly explanation script (2-4 paragraphs).
2. "visual_spec": Object containing diagram type ("circuit", "analogy_pipe", "flowchart", "formula_breakdown"), title, nodes (id, label, color), and caption.
3. "question": A conceptual check-for-understanding question.
4. "citations": Array of grounding sources referenced from context (e.g. [{{"source_title": "Chapter 4 Physics", "page": "p. 102", "snippet": "V = I * R"}}]).
"""

        user_prompt = f"""
Section: {section_title}
Key Concepts: {', '.join(key_concepts) if key_concepts else section_title}

Grounded Course Material Context (RAG):
{rag_context[:1200] if rag_context else 'Standard educational principles.'}

Produce the JSON object now.
"""
        raw_resp = await self._call_llm(system_prompt, user_prompt, json_mode=True)
        try:
            json_match = re.search(r'\{.*\}', raw_resp, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return json.loads(raw_resp)
        except Exception:
            return json.loads(self._get_fallback_json("section step"))

    async def evaluate_and_adapt(
        self,
        question: str,
        student_response: str,
        topic_context: str,
        language: str = "Hinglish"
    ) -> Dict[str, Any]:
        """
        Evaluates student response.
        If incorrect: detects misconception, switches strategy (e.g. analogy/visual), and re-explains differently.
        If correct: provides praise & deeper synthesis question.
        """
        system_prompt = f"""You are N.O.V.A., an adaptive AI Teacher.
Analyze the student's response to the question.
Language: {language}

Your task:
1. Determine if the student understood (is_correct: true/false).
2. If FALSE, identify the specific MISCONCEPTION (e.g. "Confusing direct vs inverse relation").
3. DO NOT just repeat the formula! Change your strategy (e.g. use a physical water-hose analogy, intuitive visual, simple counter-example).
4. Formulate an intuitive remedy script + simpler follow-up question + new visual diagram spec.

Return valid JSON with keys:
- is_correct (bool)
- confidence (float 0.0 - 1.0)
- misconception_detected (bool)
- misconception_title (str or null)
- misconception_explanation (str or null)
- remedy_script (str)
- simplified_question (str)
- visual_spec (object)
"""

        user_prompt = f"""
Context / Topic: {topic_context}
Question Asked by Teacher: {question}
Student's Answer: {student_response}

Evaluate the student's answer and produce the JSON analysis.
"""
        raw_resp = await self._call_llm(system_prompt, user_prompt, json_mode=True)
        try:
            json_match = re.search(r'\{.*\}', raw_resp, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return json.loads(raw_resp)
        except Exception:
            return json.loads(self._get_fallback_json("evaluat misconception"))
