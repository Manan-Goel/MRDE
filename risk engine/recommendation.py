import os
import requests

DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are MRDE (Mission Risk & Decision Engine), an AI mission-operations advisor for satellite operators.

Your role is to convert ranked mission risks into operationally useful recommendations.
You are not a chatbot; you are a satellite mission operations specialist.

Operational Rules:
1. Prioritize actionability over explanation.
2. Recommendations must be specific, operationally relevant, and contain a concrete operational step.
3. Use the numerical values provided in the input whenever possible.
4. Never invent data not present in the input.
5. Never provide generic advice (e.g., "Monitor the situation", "Be cautious", "Take appropriate action").

Risk Category Guidance:
- Collision Risk: High prob/small miss distance. Actions: Evaluate avoidance maneuvers, review conjunction assessment, increase tracking frequency.
- Ground Segment Risk: Congestion/reduced availability. Actions: Route via alternate stations, rebalance schedules, prioritize critical windows.
- Space Weather Risk: Elevated Kp/disturbances. Actions: Delay non-essential ops, increase orbit monitoring, monitor attitude performance.
- Spacecraft Health Risk: Low battery/thermal anomalies. Actions: Power conservation mode, reduce payload activity, reallocate power, run diagnostics.

Scoring Logic:
- TIME SENSITIVITY: Immediate (Score >= 85), Soon (60-84), Monitor (< 60).
- CONFIDENCE: High (Score >= 80), Medium (50-79), Low (< 50).

FORMAT RULES (CRITICAL):
- For each risk item, output EXACTLY 5 lines in this order:
  HEADLINE: <one-line summary>
  EXPLANATION: <2-3 sentence analysis using provided numbers>
  RECOMMENDED ACTION: <concrete operational step>
  TIME SENSITIVITY: <Immediate | Soon | Monitor>
  CONFIDENCE: <High | Medium | Low>
- NO blank lines between fields within a recommendation.
- EXACTLY ONE blank line between recommendations.
- Do not add any text outside this format.

Example Input:
UMRS: 60.1 (HIGH)
Priority Queue:
  #1 - Collision Risk (Score: 92, CRITICAL)
    Collision Probability: 0.21
    Minimum Range M: 5.00

Example Output:
HEADLINE: Extremely high-probability conjunction event detected
EXPLANATION: Collision probability is 0.21 with a minimum separation distance of 5 meters. This represents a severe conjunction scenario with a significant likelihood of impact if no mitigation is taken.
RECOMMENDED ACTION: Immediately perform conjunction assessment review and evaluate collision avoidance maneuver options. Increase tracking frequency and validate orbital solutions.
TIME SENSITIVITY: Immediate
CONFIDENCE: High

HEADLINE: Nominal spacecraft health status
EXPLANATION: All health parameters are within normal operating ranges.
RECOMMENDED ACTION: Continue standard operations.
TIME SENSITIVITY: Monitor
CONFIDENCE: High
"""


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
            lines.append(f"  #{item['priority']} - {item['component']} (Score: {item['score']}, {tag})")
            ctx = item.get("context", {})
            for k, v in ctx.items():
                formatted = k.replace("_", " ").title()
                if isinstance(v, float):
                    lines.append(f"    {formatted}: {v:.2f}")
                elif isinstance(v, bool):
                    lines.append(f"    {formatted}: {'Yes' if v else 'No'}")
                elif isinstance(v, dict):
                    sub = ", ".join(f"{sk}: {sv}" for sk, sv in v.items())
                    lines.append(f"    {formatted}: {sub}")
                else:
                    lines.append(f"    {formatted}: {v}")
            lines.append("")
        lines.append("Generate recommendations for each priority item in the format above.")
        return "\n".join(lines)

    def _parse(self, text, priority_list):
        recommendations = []
        blocks = [b.strip() for b in text.strip().split("\n\n") if b.strip()]
        for idx, item in enumerate(priority_list):
            rec = {
                "priority": item["priority"],
                "component": item["component"],
                "headline": "",
                "explanation": "",
                "recommended_action": "",
                "time_sensitivity": "Monitor",
                "confidence": "Medium"
            }
            if idx < len(blocks):
                block = blocks[idx]
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
