from .execution_standard import EXECUTION_STANDARD


class BaseSpecialist:
    name: str = ""
    domain: str = ""
    specialist_mindset: str = ""

    def build_system_prompt(self) -> str:
        return f"""
{EXECUTION_STANDARD}

SPECIALIZATION:
{self.specialist_mindset}

Focus only on actionable investigation.
"""
