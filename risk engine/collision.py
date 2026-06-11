class CollisionRisk:

    @staticmethod
    def calculate(
        collision_probability,
        min_range_m
    ):

        if collision_probability >= 0.1:
            prob_score = 100

        elif collision_probability >= 0.01:
            prob_score = 90

        elif collision_probability >= 0.001:
            prob_score = 80

        elif collision_probability >= 1e-4:
            prob_score = 60

        elif collision_probability >= 1e-5:
            prob_score = 40

        else:
            prob_score = 20

        if min_range_m <= 10:
            distance_score = 100

        elif min_range_m <= 25:
            distance_score = 90

        elif min_range_m <= 50:
            distance_score = 80

        elif min_range_m <= 100:
            distance_score = 60

        elif min_range_m <= 500:
            distance_score = 40

        else:
            distance_score = 20

        score = (
            prob_score * 0.7
            +
            distance_score * 0.3
        )

        return {
            "component": "Collision Risk",
            "score": round(score, 2)
        }