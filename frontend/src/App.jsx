import { Container, Stack, Text } from "@mantine/core";

import Header from "./components/Header";
import PromptBox from "./components/PromptBox";
import useGeminiLive from "./hooks/useGeminiLive";

function App() {
  const live = useGeminiLive();

  return (
    <Container size="md" py="xl">
      <Stack>
        <Header
          connected={live.connected}
          status={live.status}
          connect={live.connect}
          disconnect={live.disconnect}
        />
        <PromptBox
          prompt={live.prompt}
          setPrompt={live.setPrompt}
          sendPrompt={live.sendPrompt}
          loading={live.isGenerating}
        />
        <Text>{live.transcript}</Text>
      </Stack>
    </Container>
  );
}

export default App;
