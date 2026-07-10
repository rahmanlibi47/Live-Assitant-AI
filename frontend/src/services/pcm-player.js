export class PCMPlayer {
  constructor({
    sampleRate = 24000,
    channels = 1,
    bufferSize = 4096
  } = {}) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.bufferSize = bufferSize;

    this.audioContext = new AudioContext({
      sampleRate: this.sampleRate
    });

    this.queue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;
  }

  async start() {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    this.nextStartTime = this.audioContext.currentTime;
  }

  play(pcmChunk) {
    if (!this.isPlaying) return;

    const float32Data = this.pcm16ToFloat32(pcmChunk);

    const audioBuffer = this.audioContext.createBuffer(
      this.channels,
      float32Data.length,
      this.sampleRate
    );

    audioBuffer.copyToChannel(float32Data, 0);

    const source = this.audioContext.createBufferSource();

    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;

    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);

    this.nextStartTime += audioBuffer.duration;

    this.queue.push(source);

    source.onended = () => {
      const index = this.queue.indexOf(source);

      if (index !== -1) {
        this.queue.splice(index, 1);
      }
    };
  }

  pcm16ToFloat32(buffer) {
    const pcm16 = new Int16Array(buffer);
    const float32 = new Float32Array(pcm16.length);

    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    return float32;
  }

  stop() {
    this.isPlaying = false;

    this.queue.forEach((source) => {
      try {
        source.stop();
      } catch {}
    });

    this.queue = [];
    this.nextStartTime = this.audioContext.currentTime;
  }

  clear() {
    this.queue = [];
    this.nextStartTime = this.audioContext.currentTime;
  }
}