import os
import json
import base64
import asyncio
import websockets
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

MODEL = "gemini-2.5-flash-native-audio-latest"

WS_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta."
    f"GenerativeService.BidiGenerateContent?key={API_KEY}"
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

class SpeakRequest(BaseModel):
    prompt: str
    

@app.get("/")
async def home():
    return FileResponse("static/index.html")

@app.post("/speak")
async def speak(request: SpeakRequest):

    audio_chunks = []

    print("=" * 60)
    print("Connecting to Gemini Live...")

    async with websockets.connect(WS_URL) as websocket:

        setup_message = {
            "setup": {
                "model": f"models/{MODEL}",
                "generationConfig": {
                    "responseModalities": ["AUDIO"]
                },
                "systemInstruction": {
                    "parts": [
                        {
                            "text": "You are a helpful assistant."
                        }
                    ]
                },
            }
        }

        await websocket.send(json.dumps(setup_message))

        print("✓ Setup sent")

        await asyncio.sleep(1)

        prompt = {
            "realtimeInput": {
                "text": request.prompt
            }
        }

        await websocket.send(json.dumps(prompt))

        print("✓ Prompt sent")

        while True:

            try:
                message = await websocket.recv()

            except websockets.ConnectionClosed:
                print("WebSocket closed.")
                break

            response = json.loads(message)

            if "serverContent" not in response:
                continue

            server = response["serverContent"]

            if "modelTurn" in server:

                parts = server["modelTurn"].get("parts", [])

                for part in parts:

                    if "inlineData" not in part:
                        continue

                    chunk = base64.b64decode(
                        part["inlineData"]["data"]
                    )

                    audio_chunks.append(chunk)

            if server.get("turnComplete"):
                break

    if not audio_chunks:
        return Response(status_code=500)

    pcm_data = b"".join(audio_chunks)

    return Response(
        content=pcm_data,
        media_type="audio/pcm"
    )