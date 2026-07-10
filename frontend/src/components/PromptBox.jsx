import { Textarea, Button } from "@mantine/core";

export default function PromptBox({ prompt, setPrompt, sendPrompt, loading }) {
  return (
    <>
      <Textarea
        minRows={6}
        autosize
        value={prompt}
        placeholder="Ask Gemini anything..."
        onChange={(e) => setPrompt(e.target.value)}
      />

      <Button loading={loading} onClick={sendPrompt}>
        Speak
      </Button>
    </>
  );
}
