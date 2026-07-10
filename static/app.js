async function start() {

    const response = await fetch("/speak");

    const pcm = await response.arrayBuffer();

    playPCM(pcm);

}

function playPCM(buffer) {

    const sampleRate = 24000;

    const pcm = new Int16Array(buffer);

    const audioContext = new AudioContext({
        sampleRate
    });

    const audioBuffer = audioContext.createBuffer(
        1,
        pcm.length,
        sampleRate
    );

    const channel = audioBuffer.getChannelData(0);

    for (let i = 0; i < pcm.length; i++) {

        channel[i] = pcm[i] / 32768;

    }

    const source = audioContext.createBufferSource();

    source.buffer = audioBuffer;

    source.connect(audioContext.destination);

    source.start();

}