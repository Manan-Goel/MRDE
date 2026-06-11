import os
import requests

DEFAULT_MODEL = "google/gemma-2-9b-it:free"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are a satellite operations advisor. Given ranked mission risks, generate clear operational recommendations.

For each priority item, produce exactly this format:

HEADLINE: <one-line summary of the risk>
EXPLANATION: <2-3 sentence analysis of why this matters, including relevant numbers>
RECOMMENDED ACTION: <specific actionable step the operator should take>
TIME SENSITIVITY: <Immediate | Soon | Monitor>
CONFIDENCE: <High | Medium | Low>

Be specific, use the actual numbers provided, and give actionable advice. Do not add any commentary outside the format."""


class RecommendationEngine:

    def __init__(self, api_key=None, model=None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.model = model or os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)

    def generate(self, priority_list, umrs_result):
        if not self.api_key:
            return self._fallback(priority_list, umrs_result)

        prompt = self._build_prompt(priority_list, umrs_result)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 1024
        }

        try:
            resp = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"]
            return self._parse(text, priority_list)
        except Exception as e:
            return self._fallback(priority_list, umrs_result, error=str(e))

    def _build_prompt(self, priority_list, umrs_result):
        lines = [
            f"UMRS: {umrs_result['umrs']} ({umrs_result['level']})",
            "",
            "Priority Queue:"
        ]
        for item in priority_list:
            tag = "CRITICAL" if item["critical"] else item.get("level", "MODERATE")
            lines.append(
                f"  #{item['priority']} - {item['component']} "
                f"(Score: {item['score']}, {tag})"
            )
            lines.append("")
        lines.append("Generate recommendations for each priority item in the format above.")
        return "\n".join(lines)

    def _parse(self, text, priority_list):
        recommendations = []
        blocks = text.strip().split("\n\n")
        for item in priority_list:
            rec = {
                "priority": item["priority"],
                "component": item["component"],
                "headline": "",
                "explanation": "",
                "recommended_action": "",
                "time_sensitivity": "Monitor",
                "confidence": "Medium"
            }
            for block in blocks:
                if item["component"].lower() in block.lower() or f"#{item['priority']}" in block[:10]:
                    for line in block.split("\n"):
                        line = line.strip()
                        if line.startswith("HEADLINE:"):
                            rec["headline"] = line.replace("HEADLINE:", "").strip()
                        elif line.startswith("EXPLANATION:"):
                            rec["explanation"] = line.replace("EXPLANATION:", "").strip()
                        elif line.startswith("RECOMMENDED ACTION:"):
                            rec["recommended_action"] = line.replace("RECOMMENDED ACTION:", "").strip()
                        elif line.startswith("TIME SENSITIVITY:"):
                            val = line.replace("TIME SENSITIVITY:", "").split("|")[0].strip()
                            rec["time_sensitivity"] = val
                        elif line.startswith("CONFIDENCE:"):
                            val = line.replace("CONFIDENCE:", "").split("|")[0].strip()
                            rec["confidence"] = val
            recommendations.append(rec)
        return recommendations

    def _fallback(self, priority_list, umrs_result, error=None):
        recommendations = []
        for item in priority_list:
            rec = {
                "priority": item["priority"],
                "component": item["component"],
                "headline": f"{item['component']} at {'CRITICAL' if item['critical'] else 'ELEVATED'} risk (score: {item['score']})",
                "explanation": f"UMRS is {umrs_result['umrs']} ({umrs_result['level']}). "
                              f"{item['component']} scores {item['score']} "
                              f"{'- exceeds critical threshold' if item['critical'] else ''}.",
                "recommended_action": f"Review {item['component'].lower()} mitigation plan.",
                "time_sensitivity": "Immediate" if item["critical"] else "Soon",
                "confidence": "High" if item["critical"] else "Medium"
            }
            if error:
                rec["_llm_error"] = error
            recommendations.append(rec)
        return recommendations

    @staticmethod
    def generate_fallback(priority_list, umrs_result):
        engine = RecommendationEngine(api_key=None)
        return engine.generate(priority_list, umrs_result)
