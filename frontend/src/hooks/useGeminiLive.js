import { useState, useRef } from "react";
import { PCMPlayer } from "../services/pcm-player";

export default function useGeminiLive() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [connected, setConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState("");

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

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    socketRef.current = new WebSocket(
      `${protocol}://${window.location.host}/ws/live`,
    );
    socketRef.current.binaryType = "arraybuffer";

    socketRef.current.onopen = () => {
      console.log("Connected");
      setConnected(true);
      setStatus("Connected");
    };

    socketRef.current.onmessage = (event) => {
      // Audio chunks
      if (event.data instanceof ArrayBuffer) {
        playerRef.current.play(event.data);
        return;
      }

      const message = JSON.parse(event.data);

      if (message.type === "text") {
        setTranscript((prev) => prev + message.text);
        return;
      }

      if (message.type === "end") {
        setIsGenerating(false);
        setStatus("Ready");
        setTranscript("");
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

    const message = prompt.trim();

    if (!message) return;

    socketRef.current.send(message);

    setPrompt("");
    setIsGenerating(true);
    setStatus("Generating...");
  }

  return {
    prompt,
    setPrompt,

    status,
    connected,
    isGenerating,

    connect,
    disconnect,
    sendPrompt,

    transcript,
    setTranscript,
  };
}
