import { useState } from "react";

function App() {
  const [status, setStatus] = useState("Idle");
  const [prompt, setPrompt] = useState("");

  async function speak() {
    try {
      setStatus("Generating...");

      const response = await fetch("http://127.0.0.1:8000/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      const pcm = await response.arrayBuffer();

      playPCM(pcm);

      setStatus("Done");
    } catch (error) {
      console.error(error);

      setStatus("Error");
    }
  }

  function playPCM(buffer) {
    const sampleRate = 24000;

    const pcm = new Int16Array(buffer);

    const audioContext = new AudioContext({
      sampleRate,
    });

    const audioBuffer = audioContext.createBuffer(1, pcm.length, sampleRate);

    const channel = audioBuffer.getChannelData(0);

    for (let i = 0; i < pcm.length; i++) {
      channel[i] = pcm[i] / 32768;
    }

    const source = audioContext.createBufferSource();

    source.buffer = audioBuffer;

    source.connect(audioContext.destination);

    source.start();
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Gemini Live</h1>
      <textarea
        rows={6}
        cols={60}
        placeholder="Enter your prompt..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button onClick={speak}>Speak</button>

      <p>{status}</p>
    </div>
  );
}

export default App;
