
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
  Language, 
  LanguageNames, 
  VoiceName, 
  ProcessingState, 
  TranslationResult 
} from './types';
import { geminiService } from './services/geminiService';
import { fileToBase64, audioBufferToMp3, extractAndCompressAudio } from './utils/audio';

// --- Icons ---
const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);

const AudioIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
);

const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const SubtitleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M7 8h10"/><path d="M7 12h8"/></svg>
);

const Mp3Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10"/><path d="M3 12h18"/><path d="M9 18v-3"/><path d="M12 18v-4"/><path d="M15 18v-2"/></svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

// --- Components ---

const Header: React.FC = () => (
  <header className="py-6 px-4 mb-8">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
          <GlobeIcon />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight bn-font gradient-text">লিঙ্গুয়াকনভার্ট</h1>
          <p className="text-slate-400 text-sm bn-font">AI-চালিত অডিও ও ভিডিও ডাবিং</p>
        </div>
      </div>
      <nav className="flex gap-4">
        <button className="px-4 py-2 rounded-full glass hover:bg-white/10 transition-colors text-sm font-medium">ডকুমেন্টেশন</button>
        <button className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-medium">লগইন</button>
      </nav>
    </div>
  </header>
);

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [targetLang, setTargetLang] = useState<Language>(Language.Bengali);
  const [voice, setVoice] = useState<VoiceName>(VoiceName.Zephyr);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    status: '',
    progress: 0
  });
  const [result, setResult] = useState<TranslationResult & { dubbedDuration?: number, mp3Url?: string, srtUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingSynced, setIsPlayingSynced] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dubbedAudioRef = useRef<HTMLAudioElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sortedLanguages = useMemo(() => {
    return Object.entries(LanguageNames).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      if (result?.audioUrl) URL.revokeObjectURL(result.audioUrl);
      if (result?.mp3Url) URL.revokeObjectURL(result.mp3Url);
      if (result?.srtUrl) URL.revokeObjectURL(result.srtUrl);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fileUrl, result]);

  useEffect(() => {
    let interval: number;
    if (isPlayingSynced && videoRef.current && dubbedAudioRef.current) {
      interval = window.setInterval(() => {
        const v = videoRef.current;
        const a = dubbedAudioRef.current;
        if (v && a && Math.abs(v.currentTime - a.currentTime) > 0.15) {
          a.currentTime = v.currentTime;
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlayingSynced]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 300 * 1024 * 1024) {
        setError("ফাইলটি ৩০০ এমবি-র নিচে হতে হবে।");
        return;
      }
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setDuration(0);
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);
      const element = selectedFile.type.startsWith('video') 
        ? document.createElement('video') 
        : document.createElement('audio');
      element.src = url;
      element.onloadedmetadata = () => setDuration(element.duration);
    }
  };

  const startProcessing = async () => {
    if (!file) return;
    abortControllerRef.current = new AbortController();
    setProcessing({ isProcessing: true, status: 'ফাইল প্রস্তুত করা হচ্ছে...', progress: 10 });
    setError(null);
    try {
      const { base64, mimeType } = await extractAndCompressAudio(file);
      const data = await geminiService.processDubbing(
        base64,
        mimeType,
        targetLang,
        voice,
        duration,
        (status) => setProcessing(prev => ({ ...prev, status })),
        abortControllerRef.current.signal
      );
      
      const mp3Blob = audioBufferToMp3(data.buffer);
      const mp3Url = URL.createObjectURL(mp3Blob);
      
      let srtUrl = undefined;
      if (data.srtSubtitles) {
        const srtBlob = new Blob([data.srtSubtitles], { type: 'text/plain' });
        srtUrl = URL.createObjectURL(srtBlob);
      }

      setResult({
        originalText: data.originalText,
        translatedText: data.translatedText,
        srtSubtitles: data.srtSubtitles,
        audioUrl: data.audioUrl,
        mp3Url,
        srtUrl,
        sourceLang: Language.English,
        targetLang: targetLang,
        dubbedDuration: data.buffer.duration
      });
      setProcessing({ isProcessing: false, status: 'সম্পন্ন', progress: 100 });
    } catch (err: any) {
      if (err.message !== 'Aborted') {
        setError("ডাবিং সম্পন্ন করা সম্ভব হয়নি। ছোট ফাইল চেষ্টা করুন।");
      }
      setProcessing({ isProcessing: false, status: '', progress: 0 });
    }
  };

  const playSynced = () => {
    if (videoRef.current && dubbedAudioRef.current) {
      videoRef.current.currentTime = 0;
      dubbedAudioRef.current.currentTime = 0;
      videoRef.current.muted = true;
      videoRef.current.play();
      dubbedAudioRef.current.play();
      setIsPlayingSynced(true);
      dubbedAudioRef.current.onended = () => {
        setIsPlayingSynced(false);
        videoRef.current?.pause();
      };
    }
  };

  const stopSynced = () => {
    if (videoRef.current && dubbedAudioRef.current) {
      videoRef.current.pause();
      dubbedAudioRef.current.pause();
      setIsPlayingSynced(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <main className="max-w-6xl mx-auto px-4">
        <section className="text-center mb-16 py-12">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 bn-font leading-tight">
            ভাষার বাধা ভেঙে দিন <br /> 
            <span className="gradient-text">পারফেক্ট টাইমিংয়ে ডাবিং করুন</span>
          </h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto bn-font">
            অডিও এবং ভিডিওর সময় এখন স্বয়ংক্রিয়ভাবে ১০০% নিখুঁতভাবে মেলানো হয়।
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass p-8 rounded-3xl space-y-8">
            <h3 className="text-xl font-bold bn-font flex items-center gap-2">
              <UploadIcon /> সেটআপ
            </h3>
            <div className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer border-slate-700 hover:border-blue-500 bg-white/5 transition-all" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*,video/*" />
              {file ? (
                <div className="space-y-2"><p className="text-blue-400 font-semibold">{file.name}</p></div>
              ) : (
                <p className="bn-font opacity-60">ফাইল আপলোড করুন (ভিডিও বা অডিও)</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-slate-400 bn-font">টার্গেট ভাষা</label>
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value as Language)} className="w-full bg-slate-800 rounded-xl p-3 outline-none">
                  {sortedLanguages.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400 bn-font">ভয়েস</label>
                <select value={voice} onChange={(e) => setVoice(e.target.value as VoiceName)} className="w-full bg-slate-800 rounded-xl p-3 outline-none">
                  {Object.values(VoiceName).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            {error && <div className="p-4 bg-red-500/10 border border-red-500 rounded-xl text-red-400 text-sm bn-font">{error}</div>}
            <button onClick={startProcessing} disabled={!file || processing.isProcessing} className="w-full py-4 bg-blue-600 rounded-xl font-bold text-lg hover:bg-blue-500 transition-all disabled:opacity-50 bn-font">
              {processing.isProcessing ? processing.status : "ডাবিং শুরু করুন"}
            </button>
          </div>

          <div className="glass p-8 rounded-3xl flex flex-col">
            <h3 className="text-xl font-bold bn-font flex items-center gap-2 mb-6">আউটপুট প্রিভিউ</h3>
            {result ? (
              <div className="space-y-6">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 group">
                  {file?.type.startsWith('video') && fileUrl ? (
                    <video ref={videoRef} src={fileUrl} className="w-full h-full" />
                  ) : <div className="w-full h-full flex items-center justify-center opacity-20"><AudioIcon /></div>}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={isPlayingSynced ? stopSynced : playSynced} className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                      {isPlayingSynced ? <StopIcon /> : <PlayIcon />}
                    </button>
                  </div>
                </div>
                <audio ref={dubbedAudioRef} src={result.audioUrl} className="hidden" />
                <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 bn-font text-sm font-bold">
                    <ClockIcon /> সময় সমন্বয় সম্পন্ন (Time Synced)
                  </div>
                  <div className="text-xs text-slate-500 italic font-mono">
                    {duration.toFixed(2)}s / {result.dubbedDuration?.toFixed(2)}s
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <a href={result.mp3Url} download="dubbed.mp3" className="p-3 bg-blue-600 rounded-xl text-center font-bold bn-font flex items-center justify-center gap-2 text-sm"><Mp3Icon /> MP3</a>
                  <a href={result.audioUrl} download="dubbed.wav" className="p-3 bg-slate-800 rounded-xl text-center font-bold bn-font flex items-center justify-center gap-2 text-sm"><AudioIcon /> WAV</a>
                  {result.srtUrl && (
                    <a href={result.srtUrl} download="subtitles.srt" className="p-3 bg-indigo-600/50 hover:bg-indigo-600 rounded-xl text-center font-bold bn-font flex items-center justify-center gap-2 text-sm transition-colors border border-indigo-500/30">
                      <SubtitleIcon /> সাবটাইটেল
                    </a>
                  )}
                </div>
                <div className="space-y-2">
                   <p className="text-xs text-slate-500 uppercase font-bold bn-font">অনুবাদ চিত্র (Translated Script)</p>
                   <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-sm leading-relaxed max-h-40 overflow-y-auto bn-font">
                     {result.translatedText}
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 bn-font">
                <AudioIcon /> <p className="mt-4">ফাইল আপলোড করে প্রসেসিং শুরু করুন</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
