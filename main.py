import os
import json
import base64
import asyncio
import websockets
from fastapi.responses import Response
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

MODEL = "gemini-2.5-flash-native-audio-latest"

WS_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta."
    f"GenerativeService.BidiGenerateContent?key={API_KEY}"
)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def home():
    return FileResponse("static/index.html")


@app.get("/speak")
async def speak():

    audio_chunks = []

    print("=" * 60)
    print("Connecting to Gemini Live...")

    async with websockets.connect(WS_URL) as websocket:
        setup_message = {
            "setup": {
                "model": f"models/{MODEL}",
                "generationConfig": {"responseModalities": ["AUDIO"]},
                "systemInstruction": {
                    "parts": [{"text": "You are a helpful assistant."}]
                },
            }
        }

        await websocket.send(json.dumps(setup_message))

        print("✓ Setup sent")

        await asyncio.sleep(1)

        prompt = {
            "realtimeInput": {"text": "Hi, how are you?"}
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

            if server.get("generationComplete"):
                print("Generation complete.")

            if "modelTurn" in server:
                parts = server["modelTurn"].get("parts", [])

                for part in parts:
                    if "inlineData" not in part:
                        continue

                    mime = part["inlineData"].get("mimeType")

                    print("Audio mime:", mime)

                    chunk = base64.b64decode(part["inlineData"]["data"])

                    print(f"Chunk received: {len(chunk)} bytes")

                    audio_chunks.append(chunk)

            if server.get("turnComplete"):
                print("Turn complete.")
                break

    print(f"Total chunks: {len(audio_chunks)}")

    if not audio_chunks:
        return Response(status_code=500)

    pcm_data = b"".join(audio_chunks)

    return Response(content=pcm_data, media_type="audio/pcm")
