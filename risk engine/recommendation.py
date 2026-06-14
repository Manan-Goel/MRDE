import os
import requests

DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are MRDE (Mission Risk & Decision Engine), an AI mission-operations advisor for satellite operators.

Your role is to convert ranked mission risks into thorough, operationally useful recommendations.
You are a senior satellite mission operations specialist providing detailed analysis.

Operational Rules:
1. Provide thorough analysis and explanation for each risk item (3-4 sentences minimum).
2. Recommendations must be specific, operationally relevant, and detailed with concrete steps.
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
  EXPLANATION: <3-4 sentence detailed analysis explaining the risk, what it means, and potential consequences. Use provided numbers and context. Be thorough and descriptive.>
  RECOMMENDED ACTION: <detailed step-by-step recommended action, 2-4 sentences with specific operational steps and rationale>
  TIME SENSITIVITY: <Immediate | Soon | Monitor>
  CONFIDENCE: <High | Medium | Low>
- NO blank lines between fields within a recommendation.
- EXACTLY ONE blank line between recommendations.
- Do not add any text outside this format.
- Make explanations descriptive and actionable. Write paragraphs, not bullet points.
- Do not use markdown formatting (no bold, italics, backticks).

Example Input:
UMRS: 60.1 (HIGH)
Priority Queue:
  #1 - Collision Risk (Score: 92, CRITICAL)
    Collision Probability: 0.21
    Minimum Range M: 5.00

Example Output:
HEADLINE: Extremely high-probability conjunction event detected
EXPLANATION: Collision probability is 0.21 with a minimum separation distance of only 5 meters. This indicates a severe conjunction scenario where the predicted miss distance is nearly within the positional uncertainty envelope. Without immediate intervention, the risk of collision is significant and could result in catastrophic fragmentation, creating additional debris and endangering nearby assets. The high collision probability combined with extremely low range makes this one of the most critical conjunction events possible.
RECOMMENDED ACTION: Immediately perform a conjunction assessment review and compute refined orbit solutions using the latest tracking data. Evaluate collision avoidance maneuver options including a radial separation burn of at least 50 m/s. Coordinate with the Joint Space Operations Center to increase tracking frequency and validate conjunction predictions. Prepare contingency procedures for loss of asset if maneuver is not feasible.
TIME SENSITIVITY: Immediate
CONFIDENCE: High

HEADLINE: Nominal spacecraft health status with stable telemetry
EXPLANATION: All health parameters are within normal operating ranges and show no anomalies. Battery levels, thermal readings, and subsystem telemetry indicate stable, nominal operation. No action is required at this time as all margins remain within acceptable bounds.
RECOMMENDED ACTION: Continue standard operations and maintain regular telemetry monitoring cadence. Schedule next comprehensive health assessment at the standard weekly interval unless telemetry indicates any developing trend.
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
            "max_tokens": 2048
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
                    if not line:
                        continue
                    # Clean markdown markers (asterisks, backticks, spaces) at start/end
                    clean_line = line.strip("*` \t")
                    upper_line = clean_line.upper()
                    
                    if upper_line.startswith("HEADLINE"):
                        parts = clean_line.split(":", 1)
                        if len(parts) > 1:
                            rec["headline"] = parts[1].strip()
                    elif upper_line.startswith("EXPLANATION"):
                        parts = clean_line.split(":", 1)
                        if len(parts) > 1:
                            rec["explanation"] = parts[1].strip()
                    elif upper_line.startswith("RECOMMENDED ACTION") or upper_line.startswith("RECOMMENDED_ACTION"):
                        parts = clean_line.split(":", 1)
                        if len(parts) > 1:
                            rec["recommended_action"] = parts[1].strip()
                    elif upper_line.startswith("TIME SENSITIVITY") or upper_line.startswith("TIME_SENSITIVITY"):
                        parts = clean_line.split(":", 1)
                        if len(parts) > 1:
                            val = parts[1].split("|")[0].strip()
                            rec["time_sensitivity"] = val
                    elif upper_line.startswith("CONFIDENCE"):
                        parts = clean_line.split(":", 1)
                        if len(parts) > 1:
                            val = parts[1].split("|")[0].strip()
                            rec["confidence"] = val
            # If LLM didn't provide all fields, use fallback values
            if not rec["headline"]:
                rec["headline"] = f"{item['component']} risk at score {item['score']}"
            if not rec["explanation"]:
                rec["explanation"] = f"Risk score is {item['score']}. Review and address."
            if not rec["recommended_action"]:
                rec["recommended_action"] = f"Monitor {item['component'].lower()} and take corrective action as needed."
            recommendations.append(rec)
        return recommendations

    def _fallback(self, priority_list, umrs_result, error=None):
        recommendations = []
        for item in priority_list:
            comp = item['component']
            critical = item['critical']
            score = item['score']
            ctx = item.get("context", {})
            
            if comp == "Collision Risk":
                pc = ctx.get("collision_probability", 0)
                rng = ctx.get("minimum_range_m", 0)
                headline = f"High-probability conjunction: pc={pc:.3f}, range={rng:.0f}m"
                explanation = f"Collision probability is {pc:.3f} with a minimum separation distance of {rng:.0f} meters. This indicates a significant conjunction scenario requiring immediate assessment. The miss distance is close to or within typical positional uncertainty, creating a non-negligible collision risk. Without maneuver planning, the probability of collision remains elevated through the encounter."
                recommended_action = f"Immediately request updated tracking data and compute refined orbit solutions. Evaluate collision avoidance maneuver options including radial separation burns. Coordinate with conjunction assessment teams to increase tracking frequency and validate predictions. Prepare contingency procedures for potential loss of asset."
            elif comp == "Spacecraft Health":
                bat = ctx.get("battery_percentage", 0)
                ecl = ctx.get("eclipse_duration_min", 0)
                temp = ctx.get("temperature_status", "Nominal")
                headline = f"Spacecraft health degraded: battery {bat}%, temp {temp}, eclipse {ecl}min"
                explanation = f"Battery level is at {bat}% with {ecl} minutes of eclipse remaining. Temperature status is {temp}. These combined factors indicate degraded spacecraft health that could impact mission operations. Power margins are reduced and thermal stress may affect payload performance."
                recommended_action = f"Implement power conservation mode by reducing non-essential payload activity. Monitor battery state of charge closely through eclipse period. If temperature remains elevated, consider reducing payload duty cycle to lower thermal output. Run diagnostic telemetry review to identify root cause of thermal anomaly."
            elif comp == "Ground Segment":
                obs = ctx.get("future_observations", 0)
                rate = ctx.get("success_rate", 0)
                st = ctx.get("station_status", "Unknown")
                stations = ctx.get("stations", {})
                offline = [s for s, v in stations.items() if v == "Offline"]
                headline = f"Ground segment degraded: {len(offline)} stations offline, {obs} future obs"
                explanation = f"Ground segment status is {st} with {len(offline)} stations currently offline. Future observation capacity is {obs} passes with average success rate of {rate:.0f}%. Reduced ground station availability limits command and telemetry opportunities, increasing operational risk for time-critical activities."
                recommended_action = f"Route critical communications through available alternate stations. Rebalance contact schedules to prioritize high-priority passes. Coordinate with network operations to expedite recovery of offline stations. Implement store-and-forward protocols for non-critical telemetry."
            elif comp == "Space Weather":
                kp = ctx.get("kp_index", 0)
                headline = f"Elevated space weather activity: Kp index {kp:.1f}"
                explanation = f"Planetary Kp index is {kp:.1f}, indicating disturbed geomagnetic conditions. Elevated Kp increases atmospheric drag uncertainty, potentially degrading orbit prediction accuracy. Spacecraft attitude control systems may experience increased torque disturbances. Communication and navigation systems could experience scintillation effects."
                recommended_action = f"Delay non-essential orbit maneuvers and sensitive operations until Kp subsides. Increase orbit determination frequency to maintain tracking accuracy. Monitor attitude control performance for anomalies. Prepare for potential GPS degradation during high-latitude passes."
            else:
                headline = f"{comp} at {'CRITICAL' if critical else 'ELEVATED'} risk with score {score}"
                ctx_lines = "; ".join(f"{k}: {v}" for k, v in ctx.items()) if ctx else ""
                explanation = f"UMRS is {umrs_result['umrs']} ({umrs_result['level']}). {comp} scores {score}, indicating {'critical' if critical else 'elevated'} risk requiring attention. "
                if ctx_lines:
                    explanation += f"Key contextual factors: {ctx_lines}. "
                explanation += "Continued monitoring and proactive mitigation are recommended to prevent escalation."
                recommended_action = f"Review and address {comp.lower()} issues. Based on current risk score of {score}, implement appropriate mitigation measures. {'Immediate action is required as this exceeds critical thresholds.' if critical else 'Schedule corrective actions at the earliest opportunity.'}"
            
            rec = {
                "priority": item["priority"],
                "component": comp,
                "headline": headline,
                "explanation": explanation,
                "recommended_action": recommended_action,
                "time_sensitivity": "Immediate" if critical else "Soon" if score >= 60 else "Monitor",
                "confidence": "High" if score >= 80 else "Medium" if score >= 50 else "Low"
            }
            if error:
                rec["_llm_error"] = error
            recommendations.append(rec)
        return recommendations

    @staticmethod
    def generate_fallback(priority_list, umrs_result):
        engine = RecommendationEngine(api_key=None)
        return engine.generate(priority_list, umrs_result)
