
// lamejs is loaded via script tag in index.html to avoid MPEGMode definition issues in ESM
const getLamejs = () => {
  const globalLamejs = (window as any).lamejs;
  if (!globalLamejs) {
    console.error("lamejs not found on window. Ensure the script tag in index.html is loading correctly.");
    return null;
  }

  /**
   * FIX: "MPEGMode is not defined" and similar errors.
   * lamejs is an older library that expects its internal classes/constants 
   * to be available in the scope it's running in. In strict ESM environments,
   * these aren't automatically global. We manually bridge them here.
   */
  if (!(window as any).MPEGMode && globalLamejs.MPEGMode) {
    const keysToBridge = [
      'MPEGMode', 'Lame', 'BitStream', 'Presets', 'GainAnalysis', 
      'QuantizePVT', 'VbrTag', 'ShortBlock', 'II_side_info'
    ];
    keysToBridge.forEach(key => {
      if (globalLamejs[key] && !(window as any)[key]) {
        (window as any)[key] = globalLamejs[key];
      }
    });
  }

  return globalLamejs;
};

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Extracts and compresses audio from a large video or audio file.
 * Resamples to 16kHz Mono to save memory and API payload size.
 */
export async function extractAndCompressAudio(file: File): Promise<{ base64: string, mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Decode original audio/video data
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  // Create lightweight audio for API (16000Hz, Mono)
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, 16000);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  
  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);
  
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({ base64, mimeType: 'audio/wav' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(wavBlob);
  });
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });
}

export function audioBufferToMp3(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  
  const lamejs = getLamejs();
  if (!lamejs) {
    throw new Error("MP3 Encoder (lamejs) not loaded. Please check your internet connection.");
  }

  /**
   * Instantiate encoder. 
   * Thanks to the bridge in getLamejs(), this will no longer throw 
   * "MPEGMode is not defined".
   */
  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
  const mp3Data = [];

  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;

  const floatToInt16 = (float32: Float32Array) => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  };

  const leftInt16 = floatToInt16(left);
  const rightInt16 = floatToInt16(right);

  const sampleBlockSize = 1152;
  for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}
