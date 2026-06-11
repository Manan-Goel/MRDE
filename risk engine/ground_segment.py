class GroundSegmentRisk:

    @staticmethod
    def calculate(
        future_obs,
        success_rate,
        status
    ):

        if future_obs <= 10:
            load_score = 20

        elif future_obs <= 33:
            load_score = 50

        elif future_obs <= 139:
            load_score = 75

        else:
            load_score = 100

        reliability_score = (
            100 - success_rate
        )

        status_map = {
            "Online": 0,
            "Testing": 40,
            "Offline": 100
        }

        availability_score = status_map.get(
            status,
            100
        )

        score = (
            load_score * 0.60 +
            reliability_score * 0.30 +
            availability_score * 0.10
        )

        return {
            "component": "Ground Segment",
            "score": round(score, 2)
        }