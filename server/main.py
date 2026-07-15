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
                        "generationConfig": {
                            "responseModalities": ["AUDIO"]
                        },
                        "outputAudioTranscription": {},
                        "systemInstruction": {
                            "parts": [
                                {
                                    "text": "You are a helpful assistant."
                                }
                            ]
                        },
                    }
                }

                await gemini.send(json.dumps(setup_message))


                await asyncio.sleep(0.5)

                await gemini.send(
                    json.dumps(
                        {
                            "realtimeInput": {
                                "text": prompt
                            }
                        }
                    )
                )


                while True:

                    try:
                        message = await gemini.recv()

                    except websockets.ConnectionClosed:
                        print("Gemini Closed")
                        break

                    response = json.loads(message)

                    server = response.get("serverContent")

                    if not server:
                        continue

                    # -------------------------
                    # Stream transcript
                    # -------------------------
                    transcription = server.get("outputTranscription")

                    if transcription:

                        text = transcription.get("text", "")

                        print(text, end="", flush=True)

                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "text",
                                    "text": text,
                                }
                            )
                        )

                    # -------------------------
                    # Stream audio
                    # -------------------------
                    parts = server.get("modelTurn", {}).get("parts", [])

                    for part in parts:

                        inline = part.get("inlineData")

                        if not inline:
                            continue

                        audio = base64.b64decode(
                            inline["data"]
                        )

                        await websocket.send_bytes(audio)

                    # -------------------------
                    # Turn finished
                    # -------------------------
                    if server.get("turnComplete"):


                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "end"
                                }
                            )
                        )

                        break

    except WebSocketDisconnect:

        print("Browser Disconnected")