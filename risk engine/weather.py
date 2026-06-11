class SpaceWeatherRisk:

    @staticmethod
    def calculate(
        kp_index,
        active_alert=False
    ):

        score = (kp_index / 9) * 100

        if active_alert:
            score += 15

        score = min(score, 100)

        return {
            "component": "Space Weather",
            "score": round(score, 2)
        }