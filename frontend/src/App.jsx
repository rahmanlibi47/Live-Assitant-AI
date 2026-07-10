import { useState, useRef } from "react";
import { PCMPlayer } from "./pcm-player";

function App() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [connected, setConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const socketRef = useRef(null);
  const playerRef = useRef(null);

  async function connect() {
    if (connected) return;

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
      setConnected(true);
      setStatus("Connected");
    };

    socketRef.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        playerRef.current.play(event.data);
        return;
      }

      if (event.data === "__END__") {
        setIsGenerating(false);
        setStatus("Ready");
      }
    };

    socketRef.current.onclose = () => {
      console.log("Disconnected");
      setConnected(false);
      setIsGenerating(false);
      setStatus("Disconnected");
    };

    socketRef.current.onerror = () => {
      console.log("Connection Error");
      setConnected(false);
      setIsGenerating(false);
      setStatus("Connection Error");
    };
  }

  function disconnect() {
    socketRef.current?.close();
  }

  function sendPrompt() {
    if (!connected || isGenerating) return;

    if (!prompt.trim()) return;

    socketRef.current.send(prompt);

    setIsGenerating(true);
    setStatus("Generating...");
  }

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Gemini Live</h1>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "20px",
        }}
      >
        <input
          type="checkbox"
          checked={connected}
          onChange={(e) => {
            if (e.target.checked) {
              connect();
            } else {
              disconnect();
            }
          }}
        />
        Connected
      </label>

      <textarea
        rows={6}
        cols={60}
        placeholder="Enter your prompt..."
        value={prompt}
        disabled={!connected || isGenerating}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <br />
      <br />

      <button
        onClick={sendPrompt}
        disabled={!connected || isGenerating || !prompt.trim()}
      >
        {isGenerating ? "Speaking..." : "Speak"}
      </button>

      <p>
        <strong>Status:</strong> {status}
      </p>
    </div>
  );
}

export default App;