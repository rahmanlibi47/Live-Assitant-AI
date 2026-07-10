from pydantic import BaseModel


class SpeakRequest(BaseModel):
    prompt: str