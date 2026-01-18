
import { GoogleGenAI, Modality } from "@google/genai";
import { Language, VoiceName } from "../types";
import { decode, decodeAudioData, audioBufferToWav } from "../utils/audio";

const API_KEY = process.env.API_KEY || "";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  /**
   * Resamples an AudioBuffer to a specific target duration.
   * This ensures the dubbed audio is exactly the same length as the video.
   */
  private async matchAudioToDuration(buffer: AudioBuffer, targetDuration: number): Promise<AudioBuffer> {
    if (Math.abs(buffer.duration - targetDuration) < 0.05) return buffer;

    const offlineCtx = new OfflineAudioContext(
      buffer.numberOfChannels,
      Math.max(1, Math.round(targetDuration * buffer.sampleRate)),
      buffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    
    // Calculate the rate needed to stretch/compress to the target duration
    // If original is 10s and target is 8s, rate = 1.25 (play faster)
    source.playbackRate.value = buffer.duration / targetDuration;
    
    source.connect(offlineCtx.destination);
    source.start(0);
    
    return await offlineCtx.startRendering();
  }

  /**
   * Translates audio/video content to target language text while respecting timing
   */
  async translateAudio(
    fileBase64: string, 
    sourceMime: string, 
    targetLang: Language, 
    durationSeconds: number,
    signal?: AbortSignal
  ): Promise<{ text: string, originalText: string, srt: string }> {
    const prompt = `You are a professional dubbing translator and subtitler.
    1. Extract speech from this ${sourceMime.startsWith('video') ? 'video' : 'audio'}.
    2. Translate to ${targetLang}. 
    3. The original content is exactly ${durationSeconds.toFixed(1)}s long.
    4. Provide a script that can be spoken naturally within this ${durationSeconds.toFixed(1)}s window.
    5. Additionally, generate professional SubRip (.srt) subtitles for the translated content, ensuring timestamps are distributed evenly across the ${durationSeconds.toFixed(1)}s duration.
    
    Return JSON:
    {
      "originalTranscription": "...",
      "translation": "...",
      "srt": "..."
    }`;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType: sourceMime } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    if (signal?.aborted) throw new Error("Aborted");

    try {
      const result = JSON.parse(response.text || "{}");
      return {
        text: result.translation || "",
        originalText: result.originalTranscription || "",
        srt: result.srt || ""
      };
    } catch (e) {
      return { text: response.text || "", originalText: "", srt: "" };
    }
  }

  /**
   * Generates speech for the dubbed version and forces it to match target duration
   */
  async generateDubbing(text: string, voice: VoiceName, targetDuration: number, signal?: AbortSignal): Promise<{ wavUrl: string, buffer: AudioBuffer }> {
    if (signal?.aborted) throw new Error("Aborted");

    const ttsPrompt = `Speak this text: ${text}. (Target pacing: ${targetDuration.toFixed(1)} seconds)`;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: ttsPrompt }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    if (signal?.aborted) throw new Error("Aborted");

    const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioData = decode(base64Audio);
    const rawBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
    
    // HARD SYNC: Stretch/compress the buffer to match original duration exactly
    const syncedBuffer = await this.matchAudioToDuration(rawBuffer, targetDuration);
    const wavBlob = audioBufferToWav(syncedBuffer);
    
    return {
      wavUrl: URL.createObjectURL(wavBlob),
      buffer: syncedBuffer
    };
  }

  /**
   * Process full flow
   */
  async processDubbing(
    fileBase64: string, 
    mimeType: string, 
    targetLang: Language, 
    voice: VoiceName,
    duration: number,
    onProgress: (status: string) => void,
    signal?: AbortSignal
  ): Promise<{ audioUrl: string, buffer: AudioBuffer, translatedText: string, originalText: string, srtSubtitles: string }> {
    
    onProgress("কন্টেন্ট বিশ্লেষণ ও অনুবাদ করা হচ্ছে...");
    const translation = await this.translateAudio(fileBase64, mimeType, targetLang, duration, signal);
    
    onProgress("ভয়েসওভার তৈরি ও সময় সমন্বয় করা হচ্ছে...");
    const dubResult = await this.generateDubbing(translation.text, voice, duration, signal);
    
    return {
      audioUrl: dubResult.wavUrl,
      buffer: dubResult.buffer,
      translatedText: translation.text,
      originalText: translation.originalText,
      srtSubtitles: translation.srt
    };
  }
}

export const geminiService = new GeminiService();
