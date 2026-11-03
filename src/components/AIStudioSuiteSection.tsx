import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Box,
  Check,
  ExternalLink,
  Film,
  FlaskConical,
  Globe,
  ImagePlus,
  Loader2,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Send,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { StudioSettings, SurahMeta, VideoAspectRatio } from '../types/quran';
import { HalalSciencePanel } from './HalalSciencePanel';
import { SacredSanctuary3DModal } from './SacredSanctuary3DModal';

interface AIStudioSuiteSectionProps {
  surahs: SurahMeta[];
  onLoadVerseIntoStudio: (surahId: number, fromAyah: number, toAyah: number) => void;
  onApplyCustomBackground: (patch: Partial<StudioSettings>) => void;
}

type SuiteTab = 'assistant' | 'voice' | 'media' | 'sanctuary_science';
type ChatModelChoice = 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon';
type GroundingChoice = 'none' | 'search' | 'maps';

interface GroundingSource {
  kind: 'web' | 'maps' | 'review';
  title: string;
  uri: string;
  snippet?: string;
}

interface SuggestedRange {
  surahId: number;
  fromAyah: number;
  toAyah: number;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
  suggestedRanges?: SuggestedRange[];
  modelUsed?: string;
}

function parseAssistantReply(rawText: string): {
  cleanText: string;
  ranges: SuggestedRange[];
} {
  const ranges: SuggestedRange[] = [];
  const regex = /\[\[SURAH:(\d{1,3}):(\d{1,3}):(\d{1,3})\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const surahId = Number(match[1]);
    const fromAyah = Number(match[2]);
    const toAyah = Number(match[3]);
    if (surahId >= 1 && surahId <= 114 && fromAyah >= 1 && toAyah >= fromAyah) {
      ranges.push({ surahId, fromAyah, toAyah: Math.min(fromAyah + 29, toAyah) });
    }
  }
  const cleanText = rawText.replace(regex, '').trim();
  return { cleanText, ranges };
}

function floatTo16BitPcmBase64(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64Pcm24kToBuffer(
  base64: string,
  audioCtx: AudioContext
): AudioBuffer | null {
  try {
    const binary = atob(base64);
    const byteLen = binary.length - (binary.length % 2);
    if (byteLen <= 0) return null;
    const bytes = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const audioBuf = audioCtx.createBuffer(1, pcm16.length, 24000);
    const ch = audioBuf.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) {
      ch[i] = pcm16[i] / 32768;
    }
    return audioBuf;
  } catch {
    return null;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الملف المرفوع'));
    reader.readAsDataURL(file);
  });
}

export function AIStudioSuiteSection({
  surahs,
  onLoadVerseIntoStudio,
  onApplyCustomBackground,
}: AIStudioSuiteSectionProps) {
  const [activeTab, setActiveTab] = useState<SuiteTab>('assistant');
  const [is3DModalOpen, setIs3DModalOpen] = useState<boolean>(false);

  // --- TAB 1: CHATBOT + SEARCH & MAPS GROUNDING ---
  const [chatModel, setChatModel] = useState<ChatModelChoice>('gemini-3.8-flash');
  const [groundingMode, setGroundingMode] = useState<GroundingChoice>('none');
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'أهلاً بك في جناح المساعد القرآني الذكي. يمكنك سؤالي عن آيات السكينة أو الرزق أو الصبر لفتحها مباشرة في الاستوديو، أو تفعيل البحث الحي عبر Google وخرائط المساجد القريبة.',
      suggestedRanges: [
        { surahId: 93, fromAyah: 1, toAyah: 5 },
        { surahId: 13, fromAyah: 28, toAyah: 29 },
      ],
    },
  ]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // --- TAB 2: LIVE VOICE + AUDIO TRANSCRIPTION ---
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveInputTranscript, setLiveInputTranscript] = useState<string>('');
  const [liveOutputTranscript, setLiveOutputTranscript] = useState<string>('');

  const liveWsRef = useRef<WebSocket | null>(null);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const liveInputCtxRef = useRef<AudioContext | null>(null);
  const liveOutputCtxRef = useRef<AudioContext | null>(null);
  const liveNextStartTimeRef = useRef<number>(0);
  const liveActiveSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const [isRecordingTranscribe, setIsRecordingTranscribe] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeText, setTranscribeText] = useState<string>('');
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  // --- TAB 3: IMAGE CREATE/EDIT + VIDEO GENERATE/ANIMATE ---
  const [imgPrompt, setImgPrompt] = useState<string>(
    'محراب مسجد أندلسي هادئ وقت السحر مع ضوء فانوس ذهبي دافئ ونجوم صافية'
  );
  const [imgAspect, setImgAspect] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [imgSize, setImgSize] = useState<'1K' | '2K'>('1K');
  const [sourceEditImg, setSourceEditImg] = useState<{
    dataUrl: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState<boolean>(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const [vidPrompt, setVidPrompt] = useState<string>(
    'أمواج بحر هادئة تحت ضوء القمر مع نسيم ليلي ساكن مناسب لتلاوة قرآنية'
  );
  const [vidAspect, setVidAspect] = useState<'9:16' | '16:9'>('9:16');
  const [sourceAnimImg, setSourceAnimImg] = useState<{
    dataUrl: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [generatedVidUrl, setGeneratedVidUrl] = useState<string | null>(null);
  const [isGeneratingVid, setIsGeneratingVid] = useState<boolean>(false);
  const [vidError, setVidError] = useState<string | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatTurns, isChatLoading]);

  const stopLiveSession = () => {
    setIsLiveActive(false);
    setIsLiveConnecting(false);

    if (liveWsRef.current) {
      try {
        liveWsRef.current.close();
      } catch {
        // ignore
      }
      liveWsRef.current = null;
    }

    if (liveMicStreamRef.current) {
      liveMicStreamRef.current.getTracks().forEach((t) => t.stop());
      liveMicStreamRef.current = null;
    }

    if (liveInputCtxRef.current) {
      liveInputCtxRef.current.close().catch(() => {});
      liveInputCtxRef.current = null;
    }

    liveActiveSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore
      }
    });
    liveActiveSourcesRef.current = [];

    if (liveOutputCtxRef.current) {
      liveOutputCtxRef.current.close().catch(() => {});
      liveOutputCtxRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const handleEnableMapsMode = () => {
    setGroundingMode('maps');
    if (!userCoords && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // Proceed cleanly without coordinates if user declines geolocation
        },
        { timeout: 6000 }
      );
    }
  };

  const sendChatPrompt = async (customPrompt?: string) => {
    const text = (customPrompt ?? chatInput).trim();
    if (!text || isChatLoading) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };

    const nextHistory = [...chatTurns, userTurn];
    setChatTurns(nextHistory);
    if (!customPrompt) setChatInput('');
    setChatError(null);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          model: chatModel,
          groundingMode,
          userLocation: userCoords,
        }),
      });

      const data = (await res.json()) as {
        text?: string;
        error?: string;
        sources?: GroundingSource[];
        modelUsed?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || 'تعذر الحصول على رد من المساعد الذكي.');
      }

      const parsed = parseAssistantReply(data.text || '');
      setChatTurns((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: parsed.cleanText,
          sources: data.sources || [],
          suggestedRanges: parsed.ranges,
          modelUsed: data.modelUsed,
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بالمساعد الذكي.'
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  const startLiveSession = async () => {
    if (isLiveActive || isLiveConnecting) return;
    setLiveError(null);
    setLiveInputTranscript('');
    setLiveOutputTranscript('');
    setIsLiveConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      liveMicStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const inCtx = new AudioCtx({ sampleRate: 16000 });
      const outCtx = new AudioCtx({ sampleRate: 24000 });
      liveInputCtxRef.current = inCtx;
      liveOutputCtxRef.current = outCtx;
      liveNextStartTimeRef.current = outCtx.currentTime;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/api/live`);
      liveWsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            data?: string;
            text?: string;
            message?: string;
          };

          if (msg.type === 'connected') {
            setIsLiveConnecting(false);
            setIsLiveActive(true);

            // Start 16kHz PCM mic streaming once Gemini Live session opens
            const micSource = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (ev) => {
              if (ws.readyState !== WebSocket.OPEN) return;
              const samples = ev.inputBuffer.getChannelData(0);
              const base64 = floatTo16BitPcmBase64(samples);
              ws.send(JSON.stringify({ type: 'audio', data: base64 }));
            };
            micSource.connect(processor);
            processor.connect(inCtx.destination);
          } else if (msg.type === 'audio' && msg.data && liveOutputCtxRef.current) {
            const oCtx = liveOutputCtxRef.current;
            const buf = decodeBase64Pcm24kToBuffer(msg.data, oCtx);
            if (buf) {
              const src = oCtx.createBufferSource();
              src.buffer = buf;
              src.connect(oCtx.destination);
              const startAt = Math.max(oCtx.currentTime, liveNextStartTimeRef.current);
              src.start(startAt);
              liveNextStartTimeRef.current = startAt + buf.duration;
              liveActiveSourcesRef.current.push(src);
              src.onended = () => {
                liveActiveSourcesRef.current = liveActiveSourcesRef.current.filter(
                  (s) => s !== src
                );
              };
            }
          } else if (msg.type === 'interrupted' && liveOutputCtxRef.current) {
            liveActiveSourcesRef.current.forEach((s) => {
              try {
                s.stop();
              } catch {
                // ignore
              }
            });
            liveActiveSourcesRef.current = [];
            liveNextStartTimeRef.current = liveOutputCtxRef.current.currentTime;
          } else if (msg.type === 'inputTranscript' && msg.text) {
            setLiveInputTranscript((prev) => `${prev}${msg.text}`);
          } else if (msg.type === 'outputTranscript' && msg.text) {
            setLiveOutputTranscript((prev) => `${prev}${msg.text}`);
          } else if (msg.type === 'error') {
            setLiveError(msg.message || 'تعذر بدء المحادثة الصوتية الحية.');
            stopLiveSession();
          } else if (msg.type === 'closed') {
            stopLiveSession();
          }
        } catch {
          // ignore malformed WS message
        }
      };

      ws.onerror = () => {
        setLiveError('حدث خطأ في قناة الاتصال الصوتي المباشر.');
        stopLiveSession();
      };

      ws.onclose = () => {
        stopLiveSession();
      };
    } catch {
      setLiveError(
        'تعذر الوصول إلى الميكروفون. يرجى السماح بصلاحية الميكروفون في المتصفح ثم المحاولة مجدداً.'
      );
      stopLiveSession();
    }
  };

  const transcribeAudioBlob = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setTranscribeError(null);

    try {
      const file = new File([blob], 'recording.webm', { type: mimeType });
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: dataUrl,
          mimeType,
        }),
      });
      const data = (await res.json()) as { transcript?: string; error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error || 'تعذر تفريغ التسجيل الصوتي.');
      }
      setTranscribeText(data.transcript || '');
    } catch (err) {
      setTranscribeError(
        err instanceof Error ? err.message : 'حدث خطأ أثناء تفريغ الصوت.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggleRecordTranscribe = async () => {
    if (isRecordingTranscribe) {
      mediaRecorderRef.current?.stop();
      setIsRecordingTranscribe(false);
      return;
    }

    setTranscribeError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chosenMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: chosenMime });
      recordedChunksRef.current = [];

      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: chosenMime });
        if (blob.size > 0) {
          transcribeAudioBlob(blob, chosenMime);
        }
      };

      mediaRecorderRef.current = rec;
      rec.start();
      setIsRecordingTranscribe(true);
    } catch {
      setTranscribeError('يرجى السماح بصلاحية الميكروفون لتسجيل التلاوة أو الصوت.');
    }
  };

  const handleUploadAudioForTranscribe = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await transcribeAudioBlob(file, file.type || 'audio/mpeg');
  };

  const handleGenerateOrEditImage = async () => {
    if (!imgPrompt.trim() || isGeneratingImg) return;
    setIsGeneratingImg(true);
    setImgError(null);

    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imgPrompt,
          aspectRatio: imgAspect,
          imageSize: imgSize,
          sourceImageBase64: sourceEditImg?.dataUrl || undefined,
          sourceMimeType: sourceEditImg?.mimeType || undefined,
        }),
      });
      const data = (await res.json()) as { imageUrl?: string; error?: string };
      if (!res.ok || data.error || !data.imageUrl) {
        throw new Error(data.error || 'تعذر توليد الصورة في الوقت الحالي.');
      }
      setGeneratedImgUrl(data.imageUrl);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : 'تعذر توليد الصورة.');
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleGenerateOrAnimateVideo = async () => {
    if ((!vidPrompt.trim() && !sourceAnimImg) || isGeneratingVid) return;
    setIsGeneratingVid(true);
    setVidError(null);

    try {
      const res = await fetch('/api/ai/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: vidPrompt,
          aspectRatio: vidAspect,
          sourceImageBase64: sourceAnimImg?.dataUrl || undefined,
          sourceMimeType: sourceAnimImg?.mimeType || undefined,
        }),
      });
      const data = (await res.json()) as {
        videoDataUrl?: string | null;
        videoUri?: string | null;
        error?: string;
      };
      if (!res.ok || data.error) {
        throw new Error(data.error || 'تعذر توليد مقطع الفيديو.');
      }
      const finalUrl = data.videoDataUrl || data.videoUri || null;
      if (!finalUrl) {
        throw new Error('لم يتم استلام رابط الفيديو المولّد.');
      }
      setGeneratedVidUrl(finalUrl);
    } catch (err) {
      setVidError(err instanceof Error ? err.message : 'تعذر توليد الفيديو.');
    } finally {
      setIsGeneratingVid(false);
    }
  };

  const applyStudioAspectFromRatio = (ratio: '9:16' | '1:1' | '16:9'): VideoAspectRatio => {
    if (ratio === '1:1') return VideoAspectRatio.Square1x1;
    if (ratio === '16:9') return VideoAspectRatio.Landscape16x9;
    return VideoAspectRatio.Vertical9x16;
  };

  return (
    <section
      id="ai-suite"
      aria-labelledby="ai-suite-heading"
      className="border-t border-slate-800/80 bg-[#0D1219] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 space-y-8">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>جناح الذكاء الاصطناعي والفضاء التفاعلي</span>
            </div>
            <h2
              id="ai-suite-heading"
              className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight"
            >
              مساعد التدبر، الصوت الحي، الخلفيات الذكية، والمحراب ثلاثي الأبعاد
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              ابحث عن الآيات المناسبة لمقطعك، استعن بالبحث الحي وخرائط المساجد، فرّغ تلاوتك صوتياً، أو صمّم خلفيات ثلاثية الأبعاد ليُطبع عليها تلقائياً باركود صفحتك بالجنب الأيمن عند التصدير.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIs3DModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-amber-200 hover:bg-amber-400/20 transition-colors cursor-pointer shrink-0"
          >
            <Box className="w-4 h-4 text-amber-300" />
            <span>افتح فضاء المحراب ثلاثي الأبعاد (3D)</span>
          </button>
        </div>

        {/* Suite Navigation Tabs */}
        <div
          role="tablist"
          aria-label="أقسام الذكاء الاصطناعي"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-[#090D12] p-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'assistant'}
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'assistant'
                ? 'bg-slate-800 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>المساعد القرآني والبحث الحي</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'voice'}
            onClick={() => setActiveTab('voice')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-slate-800 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4 shrink-0" />
            <span>المحادثة الصوتية وتفريغ التلاوة</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'media'}
            onClick={() => setActiveTab('media')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'media'
                ? 'bg-slate-800 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-4 h-4 shrink-0" />
            <span>توليد الخلفيات وتحريك الفيديو</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sanctuary_science'}
            onClick={() => setActiveTab('sanctuary_science')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'sanctuary_science'
                ? 'bg-slate-800 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical className="w-4 h-4 shrink-0" />
            <span>المحراب 3D والعلوم الجزيئية</span>
          </button>
        </div>

        {/* TAB 1: GEMINI CHATBOT + SEARCH & MAPS GROUNDING */}
        {activeTab === 'assistant' && (
          <div className="rounded-2xl border border-slate-800 bg-[#121820] p-4 sm:p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              {/* Model Tier Picker */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 ml-1">النموذج:</span>
                {(
                  [
                    { id: 'gemini-3.8-flash', label: 'متوازن (3.8 Flash · مجاني)' },
                    { id: 'gemini-3.1-flash-lite', label: 'فائق السرعة (Flash Lite · مجاني)' },
                    { id: 'gemini-4-argon', label: 'تفكير عميق (4 Argon)' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChatModel(m.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      chatModel === m.id
                        ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-800 bg-[#0B0F14] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Search & Maps Grounding Mode */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 ml-1">تزويد بالبيانات الحية:</span>
                <button
                  type="button"
                  onClick={() => setGroundingMode('none')}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    groundingMode === 'none'
                      ? 'border-slate-500 bg-slate-800 text-slate-100'
                      : 'border-slate-800 bg-[#0B0F14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  المعرفة القرآنية
                </button>
                <button
                  type="button"
                  onClick={() => setGroundingMode('search')}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    groundingMode === 'search'
                      ? 'border-sky-500/70 bg-sky-500/15 text-sky-200'
                      : 'border-slate-800 bg-[#0B0F14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>بحث Google الحي</span>
                </button>
                <button
                  type="button"
                  onClick={handleEnableMapsMode}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    groundingMode === 'maps'
                      ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
                      : 'border-slate-800 bg-[#0B0F14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>خرائط المساجد والمراكز</span>
                </button>
              </div>
            </div>

            {/* Quick Prompt Starters */}
            <div className="flex flex-wrap gap-2">
              {[
                'اقترح لي ٣ مقاطع قرآنية قصيرة عن السكينة والطمأنينة مع وصف للنشر',
                'ما هي الآيات المناسبة لمقطع صدقة جارية عن الوالدين؟',
                groundingMode === 'maps'
                  ? 'ما أقرب المساجد ومراكز تحفيظ القرآن الكريم المفتوحة الآن بالقرب مني؟'
                  : 'اكتب وصفاً مؤثراً لنشر آية الكرسي في ريلز مع وسوم مناسبة',
              ].map((starter, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendChatPrompt(starter)}
                  className="rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-white transition-colors cursor-pointer"
                >
                  {starter}
                </button>
              ))}
            </div>

            {/* Scrollable Conversation Thread */}
            <div
              ref={chatScrollRef}
              className="h-96 overflow-y-auto rounded-xl border border-slate-800 bg-[#0B0F14] p-4 space-y-4"
            >
              {chatTurns.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex flex-col ${
                    turn.role === 'user' ? 'items-start' : 'items-stretch'
                  }`}
                >
                  <div
                    className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      turn.role === 'user'
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 max-w-2xl'
                        : 'bg-[#121820] border border-slate-800 text-slate-200'
                    }`}
                  >
                    {turn.text}

                    {/* One-click Load Suggested Verse Range into Studio */}
                    {turn.suggestedRanges && turn.suggestedRanges.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                        {turn.suggestedRanges.map((rng, rIdx) => {
                          const sMeta = surahs.find((s) => s.id === rng.surahId);
                          return (
                            <button
                              key={`${rng.surahId}-${rng.fromAyah}-${rIdx}`}
                              type="button"
                              onClick={() =>
                                onLoadVerseIntoStudio(
                                  rng.surahId,
                                  rng.fromAyah,
                                  rng.toAyah
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>
                                فتح سورة {sMeta?.nameArabic || rng.surahId} ({rng.fromAyah}–
                                {rng.toAyah}) في الاستوديو
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Grounding Citations (Google Search & Google Maps Links) */}
                    {turn.sources && turn.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                        <div className="text-xs font-semibold text-slate-400">
                          المصادر والروابط الموثقة:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {turn.sources.map((src, sIdx) => (
                            <a
                              key={`${src.uri}-${sIdx}`}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0B0F14] px-2.5 py-1.5 text-xs text-emerald-300 hover:border-emerald-400 transition-colors"
                            >
                              {src.kind === 'maps' || src.kind === 'review' ? (
                                <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              ) : (
                                <Globe className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                              )}
                              <span className="truncate max-w-60">{src.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#121820] px-4 py-3 text-xs text-slate-300">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>جاري تحضير الإجابة...</span>
                </div>
              )}
            </div>

            {chatError && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-200">
                {chatError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatPrompt();
              }}
              className="flex gap-2.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  groundingMode === 'maps'
                    ? 'اسأل عن المساجد أو المراكز القرآنية أو الأماكن الحلال القريبة...'
                    : groundingMode === 'search'
                    ? 'اسأل مع البحث الحي في الويب...'
                    : 'اطلب اقتراح آيات لمقطعك أو تفسيراً ميسراً أو عنواناً للنشر...'
                }
                className="flex-1 rounded-xl border border-slate-800 bg-[#0B0F14] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>إرسال</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: LIVE VOICE CONVERSATION + AUDIO TRANSCRIPTION */}
        {activeTab === 'voice' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-Time Gemini 3.8 Live Voice Assistant */}
            <div className="rounded-2xl border border-slate-800 bg-[#121820] p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    المحادثة الصوتية الحية (Gemini Live)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                    تحدّث صوتياً بشكل مباشر وفوري مع المساعد القرآني لاختيار السور وتدبر المعاني بدون كتابة.
                  </p>
                </div>
                <span className="rounded-md border border-slate-700 bg-[#0B0F14] px-2.5 py-1 text-[11px] font-mono text-emerald-300 shrink-0">
                  24kHz Live Audio
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-5 flex flex-col items-center justify-center text-center space-y-4 min-h-48">
                {!isLiveActive ? (
                  <button
                    type="button"
                    disabled={isLiveConnecting}
                    onClick={startLiveSession}
                    className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isLiveConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري فتح القناة الصوتية...</span>
                      </>
                    ) : (
                      <>
                        <PhoneCall className="w-4 h-4" />
                        <span>بدء المحادثة الصوتية المباشرة</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopLiveSession}
                    className="inline-flex items-center gap-2.5 rounded-xl bg-rose-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-rose-400 transition-colors cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>إنهاء المحادثة الصوتية</span>
                  </button>
                )}

                <p className="text-xs text-slate-400 max-w-sm">
                  {isLiveActive
                    ? 'الميكروفون نشط الآن — تحدّث بحرية وسيجيبك المساعد صوتياً مباشرة.'
                    : 'اضغط على الزر أعلاه واسمح للميكروفون لبدء حوار صوتي هادئ ومباشر.'}
                </p>
              </div>

              {(liveInputTranscript || liveOutputTranscript) && (
                <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-3.5 space-y-2 text-xs">
                  {liveInputTranscript && (
                    <div>
                      <span className="text-slate-500 ml-1">صوتك:</span>
                      <span className="text-slate-200">{liveInputTranscript}</span>
                    </div>
                  )}
                  {liveOutputTranscript && (
                    <div>
                      <span className="text-emerald-400 ml-1">رد المساعد:</span>
                      <span className="text-emerald-100">{liveOutputTranscript}</span>
                    </div>
                  )}
                </div>
              )}

              {liveError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {liveError}
                </div>
              )}
            </div>

            {/* Audio Transcription (Mic + Upload via gemini-3.5-transcribe) */}
            <div className="rounded-2xl border border-slate-800 bg-[#121820] p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  تفريغ التلاوة والتسجيلات الصوتية إلى نص
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                  سجّل بصوتك آية أو خاطرة أو ارفع ملفاً صوتياً ليتم تحويله إلى نص عربي مضبوط يمكنك البحث به أو إرساله للمساعد.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isTranscribing}
                  onClick={handleToggleRecordTranscribe}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                    isRecordingTranscribe
                      ? 'bg-rose-500 text-white hover:bg-rose-400'
                      : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                  } disabled:opacity-50`}
                >
                  {isRecordingTranscribe ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>إيقاف التسجيل وتفريغ النص</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>تسجيل صوتي بالميكروفون</span>
                    </>
                  )}
                </button>

                <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#0B0F14] px-4 py-3 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>رفع ملف صوتي</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleUploadAudioForTranscribe}
                    className="hidden"
                  />
                </label>
              </div>

              {isTranscribing && (
                <div className="inline-flex items-center gap-2 text-xs text-emerald-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تفريغ التسجيل الصوتي بدقة...</span>
                </div>
              )}

              {transcribeError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {transcribeError}
                </div>
              )}

              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={transcribeText}
                  onChange={(e) => setTranscribeText(e.target.value)}
                  placeholder="سيظهر النص المفرّغ هنا..."
                  className="w-full rounded-xl border border-slate-800 bg-[#0B0F14] p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />

                {transcribeText.trim() && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('assistant');
                        sendChatPrompt(
                          `ما السورة ورقم الآية المطابقة لهذا النص القرآني لفتحه في الاستوديو: "${transcribeText.trim()}"`
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>تحديد السورة والآية عبر المساعد الذكي</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(transcribeText).catch(() => {});
                        setCopiedTranscript(true);
                        setTimeout(() => setCopiedTranscript(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0B0F14] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{copiedTranscript ? 'تم النسخ' : 'نسخ النص'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CREATE & EDIT IMAGES + GENERATE & ANIMATE VIDEO */}
        {activeTab === 'media' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create & Edit Images (gemini-nano-banana-2.1) */}
            <div className="rounded-2xl border border-slate-800 bg-[#121820] p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    إنشاء وتعديل خلفيات المقاطع بالذكاء الاصطناعي
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    صمّم خلفية إيمانية هادئة من الصفر أو ارفع صورة لتعديل إضاءتها وأجوائها، ثم اعتمدها فوراً في الاستوديو.
                  </p>
                </div>
                <ImagePlus className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>

              <textarea
                rows={2}
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                placeholder="صف مشهد الخلفية المطلوبة أو التعديل المراد تطبيقه..."
                className="w-full rounded-xl border border-slate-800 bg-[#0B0F14] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs text-slate-400 mb-1">الأبعاد:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['9:16', '1:1', '16:9'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setImgAspect(r)}
                        className={`rounded-lg border py-1.5 text-xs font-mono cursor-pointer ${
                          imgAspect === r
                            ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                            : 'border-slate-800 bg-[#0B0F14] text-slate-400'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs text-slate-400 mb-1">الدقة:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['1K', '2K'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setImgSize(sz)}
                        className={`rounded-lg border py-1.5 text-xs font-mono cursor-pointer ${
                          imgSize === sz
                            ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                            : 'border-slate-800 bg-[#0B0F14] text-slate-400'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0B0F14] px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {sourceEditImg
                      ? `صورة مرفقة للتعديل: ${sourceEditImg.name}`
                      : 'إرفاق صورة لتعديلها (اختياري)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      const url = await readFileAsDataUrl(f);
                      setSourceEditImg({
                        dataUrl: url,
                        mimeType: f.type || 'image/png',
                        name: f.name,
                      });
                    }}
                    className="hidden"
                  />
                </label>

                {sourceEditImg && (
                  <button
                    type="button"
                    onClick={() => setSourceEditImg(null)}
                    className="text-xs text-rose-300 hover:underline cursor-pointer"
                  >
                    إزالة الصورة المرفقة
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={isGeneratingImg || !imgPrompt.trim()}
                onClick={handleGenerateOrEditImage}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGeneratingImg ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري توليد الخلفية...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>{sourceEditImg ? 'تعديل الصورة المرفقة' : 'توليد صورة الخلفية'}</span>
                  </>
                )}
              </button>

              {imgError && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
                  {imgError}
                </div>
              )}

              {generatedImgUrl && (
                <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-3 space-y-3">
                  <img
                    src={generatedImgUrl}
                    alt="خلفية مولدة بالذكاء الاصطناعي"
                    className="max-h-72 w-full object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onApplyCustomBackground({
                        customBgType: 'image',
                        customBgUrl: generatedImgUrl,
                        aspectRatio: applyStudioAspectFromRatio(imgAspect),
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>تعيين كخلفية للمقطع في الاستوديو الآن</span>
                  </button>
                </div>
              )}
            </div>

            {/* Generate Video from Text or Animate Photo (gemini-omni-1.1-flash) */}
            <div className="rounded-2xl border border-slate-800 bg-[#121820] p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    توليد فيديو من نص أو تحريك صورة ثابتة
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    حوّل وصفاً نصياً أو صورة ثابتة إلى مشهد فيديو متحرك (720p) لاستخدامه كخلفية حية للتلاوة.
                  </p>
                </div>
                <Film className="w-5 h-5 text-amber-300 shrink-0" />
              </div>

              <textarea
                rows={2}
                value={vidPrompt}
                onChange={(e) => setVidPrompt(e.target.value)}
                placeholder="صف حركة المشهد المطلوبة (مثال: غيوم فجر تتحرك ببطء فوق جبال ضبابية)..."
                className="w-full rounded-xl border border-slate-800 bg-[#0B0F14] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />

              <div>
                <span className="block text-xs text-slate-400 mb-1">أبعاد الفيديو المولّد:</span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: '9:16', label: '9:16 طولي (ريلز وشورتس)' },
                      { id: '16:9', label: '16:9 عرضي (يوتيوب)' },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setVidAspect(r.id)}
                      className={`rounded-lg border py-2 px-3 text-xs font-medium cursor-pointer ${
                        vidAspect === r.id
                          ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                          : 'border-slate-800 bg-[#0B0F14] text-slate-400'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0B0F14] px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {sourceAnimImg
                      ? `صورة للتحريك: ${sourceAnimImg.name}`
                      : 'إرفاق صورة لتحريكها إلى فيديو (اختياري)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      const url = await readFileAsDataUrl(f);
                      setSourceAnimImg({
                        dataUrl: url,
                        mimeType: f.type || 'image/png',
                        name: f.name,
                      });
                    }}
                    className="hidden"
                  />
                </label>

                {sourceAnimImg && (
                  <button
                    type="button"
                    onClick={() => setSourceAnimImg(null)}
                    className="text-xs text-rose-300 hover:underline cursor-pointer"
                  >
                    إزالة الصورة
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={isGeneratingVid || (!vidPrompt.trim() && !sourceAnimImg)}
                onClick={handleGenerateOrAnimateVideo}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGeneratingVid ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري توليد الفيديو السينمائي (قد يستغرق ٣٠–٦٠ ثانية)...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>
                      {sourceAnimImg
                        ? 'تحريك الصورة المرفقة إلى فيديو'
                        : 'توليد مقطع فيديو من الوصف'}
                    </span>
                  </>
                )}
              </button>

              {vidError && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
                  {vidError}
                </div>
              )}

              {generatedVidUrl && (
                <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-3 space-y-3">
                  <video
                    src={generatedVidUrl}
                    controls
                    loop
                    muted
                    playsInline
                    className="max-h-72 w-full rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onApplyCustomBackground({
                        customBgType: 'video',
                        customBgUrl: generatedVidUrl,
                        aspectRatio: applyStudioAspectFromRatio(vidAspect),
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>تعيين كخلفية فيديو للمقطع في الاستوديو الآن</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: 3D MIHRAB SANCTUARY LAUNCHER + HALAL BIOSCIENCE EXPLORER */}
        {activeTab === 'sanctuary_science' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-400/30 bg-[#121820] p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="text-base sm:text-lg font-bold text-slate-100">
                  فضاء المحراب والفوانيس المعماري ثلاثي الأبعاد (Three.js WebGL)
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  استعرض محراباً إسلامياً تفاعلياً بكامل الشاشة مع الفوانيس النحاسية والمصحف الشريف على الرحل الخشبي وأجواء الفجر والضحى وقيام الليل، والتقط أي زاوية لتصبح خلفية لمقطعك فوراً مجاناً بدون أي مفاتيح خارجية.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIs3DModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-200 transition-colors cursor-pointer shrink-0"
              >
                <Box className="w-4 h-4" />
                <span>دخول المحراب بملء الشاشة</span>
              </button>
            </div>

            <HalalSciencePanel />
          </div>
        )}
      </div>

      <SacredSanctuary3DModal
        isOpen={is3DModalOpen}
        onClose={() => setIs3DModalOpen(false)}
        onApplyCaptureAsBackground={(imageDataUrl) =>
          onApplyCustomBackground({
            customBgType: 'image',
            customBgUrl: imageDataUrl,
          })
        }
      />
    </section>
  );
}
