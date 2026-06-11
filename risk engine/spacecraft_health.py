class SpacecraftHealthRisk:

    @staticmethod
    def calculate(
        battery_percentage,
        eclipse_duration,
        payload_utilization,
        solar_efficiency,
        temperature_state
    ):

        battery_risk = (
            100 - battery_percentage
        )

        eclipse_risk = (
            eclipse_duration / 60
        ) * 100

        payload_risk = payload_utilization

        solar_risk = (
            100 - solar_efficiency
        )

        temp_map = {
            "Nominal": 0,
            "Warning": 50,
            "Critical": 100
        }

        temperature_risk = temp_map[
            temperature_state
        ]

        score = (
            battery_risk * 0.35 +
            eclipse_risk * 0.15 +
            payload_risk * 0.15 +
            solar_risk * 0.15 +
            temperature_risk * 0.20
        )

        return {
            "component": "Spacecraft Health",
            "score": round(score, 2)
        }