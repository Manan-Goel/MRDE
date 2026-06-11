class UMRS:

    @staticmethod
    def calculate(
        collision_score,
        weather_score,
        ground_score,
        health_score
    ):

        score = (
            collision_score * 0.35 +
            ground_score * 0.25 +
            health_score * 0.25 +
            weather_score * 0.15
        )

        if score < 25:
            level = "LOW"

        elif score < 50:
            level = "MODERATE"

        elif score < 75:
            level = "HIGH"

        else:
            level = "CRITICAL"

        return {
            "umrs": round(score, 2),
            "level": level
        }