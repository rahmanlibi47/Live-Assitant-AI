import { useState, useRef } from "react";
import { PCMPlayer } from "./pcm-player";

function App() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("Idle");

  const socketRef = useRef(null);
  const playerRef = useRef(null);

  async function connect() {
    if (!playerRef.current) {
      playerRef.current = new PCMPlayer({
        sampleRate: 24000,
        channels: 1,
      });

      await playerRef.current.start();
    }

    socketRef.current = new WebSocket("ws://127.0.0.1:8000/ws/live");

    socketRef.current.binaryType = "arraybuffer";

    socketRef.current.onopen = () => {
      console.log("Connected");
      setStatus("Connected");
    };

    socketRef.current.onmessage = (event) => {
      // Gemini audio chunk
      if (event.data instanceof ArrayBuffer) {
        playerRef.current.play(event.data);
      } else {
        console.log("Message:", event.data);
      }
    };

    socketRef.current.onclose = () => {
      setStatus("Disconnected");
    };
  }

  function sendPrompt() {
    if (!socketRef.current) {
      return;
    }

    socketRef.current.send(prompt);

    setStatus("Generating...");
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Gemini Live</h1>

      <button onClick={connect}>Connect</button>

      <br />
      <br />

      <textarea
        rows="6"
        cols="60"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <br />

      <button onClick={sendPrompt}>Speak</button>

      <p>{status}</p>
    </div>
  );
}

export default App;
