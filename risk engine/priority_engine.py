class PriorityEngine:

    CRITICAL_THRESHOLD = 85

    COMPONENT_PRIORITY = {
        "Collision Risk": 1,
        "Spacecraft Health": 2,
        "Ground Segment": 3,
        "Space Weather": 4
    }

    @classmethod
    def generate(
        cls,
        collision_score,
        weather_score,
        ground_score,
        health_score
    ):

        components = [
            {
                "component": "Collision Risk",
                "score": collision_score
            },
            {
                "component": "Spacecraft Health",
                "score": health_score
            },
            {
                "component": "Ground Segment",
                "score": ground_score
            },
            {
                "component": "Space Weather",
                "score": weather_score
            }
        ]

        for component in components:
            component["critical"] = (
                component["score"]
                >= cls.CRITICAL_THRESHOLD
            )

        components.sort(
            key=lambda x: (
                not x["critical"],
                cls.COMPONENT_PRIORITY[
                    x["component"]
                ],
                -x["score"]
            )
        )

        for idx, component in enumerate(
            components,
            start=1
        ):
            component["priority"] = idx

        return components
