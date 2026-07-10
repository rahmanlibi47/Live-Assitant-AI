import json
import base64
import asyncio
import websockets

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from fastapi import WebSocket, WebSocketDisconnect
from config import settings

WS_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta."
    f"GenerativeService.BidiGenerateContent?key={settings.GEMINI_API_KEY}"
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):

    await websocket.accept()

    print("=" * 60)
    print("Browser Connected")

    try:
        while True:
            prompt = await websocket.receive_text()

            print(f"Prompt: {prompt}")

            async with websockets.connect(WS_URL) as gemini:
                setup_message = {
                    "setup": {
                        "model": f"models/{settings.MODEL}",
                        "generationConfig": {"responseModalities": ["AUDIO"]},
                        "systemInstruction": {
                            "parts": [{"text": "You are a helpful assistant."}]
                        },
                    }
                }

                await gemini.send(json.dumps(setup_message))

                print("Gemini Connected")

                await asyncio.sleep(0.5)

                await gemini.send(json.dumps({"realtimeInput": {"text": prompt}}))

                print("Prompt Sent")

                while True:
                    try:
                        message = await gemini.recv()

                    except websockets.ConnectionClosed:
                        print("Gemini Closed")
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

                            audio = base64.b64decode(part["inlineData"]["data"])

                            # Immediately forward this chunk
                            await websocket.send_bytes(audio)

                    if server.get("turnComplete"):
                        print("Turn Complete")

                        await websocket.send_text("__END__")

                        break

    except WebSocketDisconnect:
        print("Browser Disconnected")
