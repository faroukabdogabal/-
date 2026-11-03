import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_AUDIO_HOSTS = new Set([
  'everyayah.com',
  'www.everyayah.com',
  'verses.quran.com',
  'download.quranicaudio.com',
  'cdn.islamic.network',
  'audio.qurancdn.com',
  'mirrors.quranicaudio.com',
]);

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('MISSING_GEMINI_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiErrorArabic(err: unknown, isPaidTierModel = false): {
  status: number;
  message: string;
  isPaidKeyRequired?: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();

  if (raw === 'MISSING_GEMINI_KEY' || lower.includes('api_key_invalid')) {
    return {
      status: 400,
      message:
        'مفتاح خدمة الذكاء الاصطناعي (GEMINI_API_KEY) غير مُهيأ بعد. يمكنك إضافته من الإعدادات (Settings > Secrets).',
    };
  }

  if (
    lower.includes('403') ||
    lower.includes('permission_denied') ||
    lower.includes('billing') ||
    lower.includes('not available on free')
  ) {
    return {
      status: 403,
      isPaidKeyRequired: true,
      message: isPaidTierModel
        ? 'هذه الميزة المتقدمة تتطلب مفتاح Gemini مفعّلاً عليه الدفع (Paid API Key). يمكنك إضافته في أي وقت من (Settings > Secrets)، بينما تعمل ميزات المساعد الذكي والبحث والصوت مجاناً.'
        : 'تعذر الوصول إلى النموذج المطلوب بالصلاحيات الحالية. يرجى التحقق من إعدادات المفتاح في (Settings > Secrets).',
    };
  }

  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      isPaidKeyRequired: isPaidTierModel,
      message: isPaidTierModel
        ? 'تم الوصول إلى حد الاستخدام أو أن النموذج يتطلب حساب فوترة مفعّل في (Settings > Secrets). جرّب النماذج السريعة المجانية أو أعد المحاولة بعد قليل.'
        : 'تم تجاوز حد الطلبات المؤقت، يرجى الانتظار بضع ثوانٍ ثم المحاولة مجدداً.',
    };
  }

  return {
    status: 500,
    message: 'حدث خطأ أثناء معالجة طلب الذكاء الاصطناعي، يرجى المحاولة مرة أخرى.',
  };
}

interface GroundingSourceItem {
  kind: 'web' | 'maps' | 'review';
  title: string;
  uri: string;
  snippet?: string;
}

function extractGroundingSources(candidate: unknown): GroundingSourceItem[] {
  const sources: GroundingSourceItem[] = [];
  const seenUris = new Set<string>();
  const gm = (candidate as { groundingMetadata?: Record<string, unknown> } | undefined)
    ?.groundingMetadata;
  if (!gm) return sources;

  const chunks = Array.isArray(gm.groundingChunks) ? gm.groundingChunks : [];
  for (const chunk of chunks) {
    const c = chunk as {
      web?: { uri?: string; title?: string };
      maps?: {
        uri?: string;
        title?: string;
        placeAnswerSources?: {
          reviewSnippets?: Array<{
            uri?: string;
            googleMapsUri?: string;
            text?: string;
            snippet?: string;
          }>;
        };
      };
    };

    if (c.web?.uri && !seenUris.has(c.web.uri)) {
      seenUris.add(c.web.uri);
      sources.push({
        kind: 'web',
        title: c.web.title || 'مصدر ويب موثق',
        uri: c.web.uri,
      });
    }

    if (c.maps?.uri && !seenUris.has(c.maps.uri)) {
      seenUris.add(c.maps.uri);
      sources.push({
        kind: 'maps',
        title: c.maps.title || 'موقع على خرائط Google',
        uri: c.maps.uri,
      });
    }

    const reviews = c.maps?.placeAnswerSources?.reviewSnippets;
    if (Array.isArray(reviews)) {
      for (const rev of reviews) {
        const revUri = rev.uri || rev.googleMapsUri;
        if (revUri && !seenUris.has(revUri)) {
          seenUris.add(revUri);
          sources.push({
            kind: 'review',
            title: c.maps?.title ? `مراجعة: ${c.maps.title}` : 'مراجعة خرائط Google',
            uri: revUri,
            snippet: rev.text || rev.snippet,
          });
        }
      }
    }
  }

  return sources;
}

const QURAN_ASSISTANT_SYSTEM_PROMPT = `أنت المساعد القرآني الذكي لمنصة "قرآن ريلز — صانع المقاطع القرآنية المجاني".
مهمتك مساعدة المستخدم بأدب ووقار ودقة علمية في:
1. اقتراح آيات قرآنية مؤثرة تناسب موضوع المقطع القصير (السكينة، الصبر، الرزق، بر الوالدين، الصدقة الجارية، التوبة، الأمل).
2. التفسير الميسر الموثوق وتدبر معاني الآيات الكريمة دون إفتاء شاذ.
3. صياغة وصف (Caption) جذاب ووقور لنشر المقطع القرآني على ريلز وشورتس وتيك توك.
4. عند اقتراح سورة ونطاق آيات محدد يصلح لمقطع ريلز (حتى 30 آية)، أضف في نهاية الفقرة الوسم البرمجي الدقيق بالشكل: [[SURAH:رقم_السورة:من_آية:إلى_آية]] مثل [[SURAH:93:1:5]] أو [[SURAH:2:255:255]] حتى يتمكن المستخدم من فتحها بضغطة واحدة في الاستوديو.
أجب دائماً باللغة العربية الفصحى الواضحة والمنظمة.`;

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '35mb' }));

  // CORS-safe audio proxy so Web Audio API decodeAudioData works reliably across all Quran CDNs
  app.get('/api/audio-proxy', async (req, res) => {
    const rawUrl = req.query.url;
    if (typeof rawUrl !== 'string' || !rawUrl.startsWith('https://')) {
      res.status(400).json({ error: 'Invalid audio URL' });
      return;
    }

    try {
      const parsed = new URL(rawUrl);
      if (!ALLOWED_AUDIO_HOSTS.has(parsed.hostname)) {
        res.status(403).json({ error: 'Host not permitted' });
        return;
      }

      const upstream = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'QuranReels-SadaqahJariyah/1.0',
          Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        },
      });

      if (!upstream.ok) {
        res.status(upstream.status).json({ error: `Upstream audio returned ${upstream.status}` });
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
      const contentLength = upstream.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      const arrayBuffer = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('Audio proxy error:', err);
      res.status(502).json({ error: 'Failed to fetch upstream recitation audio' });
    }
  });

  // 1. Multi-turn Gemini Chatbot + Google Search Grounding + Google Maps Grounding
  app.post('/api/ai/chat', async (req, res) => {
    const { messages, model, groundingMode, userLocation } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'يرجى إرسال نص السؤال.' });
      return;
    }

    const allowedModels = new Set([
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-4-argon',
    ]);
    const requestedModel =
      typeof model === 'string' && allowedModels.has(model) ? model : 'gemini-3.8-flash';
    const effectiveGrounding =
      groundingMode === 'search' || groundingMode === 'maps' ? groundingMode : 'none';
    // Grounding tools run on gemini-3.8-flash for reliable Search & Maps support
    const targetModel =
      effectiveGrounding !== 'none' ? 'gemini-3.8-flash' : requestedModel;
    const isPaidModel = targetModel === 'gemini-4-argon';

    try {
      const ai = getGenAIClient();
      const contents = messages
        .filter(
          (m: { role?: string; text?: string }) =>
            typeof m?.text === 'string' && m.text.trim().length > 0
        )
        .slice(-16)
        .map((m: { role?: string; text: string }) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text.trim() }],
        }));

      const config: Record<string, unknown> = {
        systemInstruction: QURAN_ASSISTANT_SYSTEM_PROMPT,
      };

      if (effectiveGrounding === 'search') {
        config.tools = [{ googleSearch: {} }];
      } else if (effectiveGrounding === 'maps') {
        config.tools = [{ googleMaps: {} }];
        if (
          userLocation &&
          typeof userLocation.latitude === 'number' &&
          typeof userLocation.longitude === 'number'
        ) {
          config.toolConfig = {
            retrievalConfig: {
              latLng: {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              },
            },
          };
        }
      }

      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config,
      });

      const candidate = response.candidates?.[0];
      const sources = extractGroundingSources(candidate);

      res.json({
        text: response.text || 'لم يتم استلام نص من النموذج.',
        modelUsed: targetModel,
        sources,
      });
    } catch (err) {
      console.error('Gemini chat error:', err);
      const formatted = formatGeminiErrorArabic(err, isPaidModel);
      res.status(formatted.status).json({
        error: formatted.message,
        isPaidKeyRequired: formatted.isPaidKeyRequired,
      });
    }
  });

  // 2. Audio Transcription via gemini-3.5-transcribe
  app.post('/api/ai/transcribe', async (req, res) => {
    const { audioBase64, mimeType } = req.body || {};
    if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
      res.status(400).json({ error: 'لم يتم إرفاق ملف أو تسجيل صوتي.' });
      return;
    }

    try {
      const ai = getGenAIClient();
      const cleanBase64 = audioBase64.includes(',')
        ? audioBase64.split(',')[1]
        : audioBase64;
      const cleanMime =
        typeof mimeType === 'string' && mimeType.trim() ? mimeType.trim() : 'audio/webm';

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: cleanBase64,
                },
              },
              {
                text: 'قم بتفريغ هذا التسجيل الصوتي بدقة عالية باللغة العربية (أو بلغة المتحدث)، مع ضبط النص القرآني إن وُجد دون إضافات خارجية.',
              },
            ],
          },
        ],
      });

      res.json({
        transcript: (response.text || '').trim(),
      });
    } catch (err) {
      console.error('Gemini transcribe error:', err);
      const formatted = formatGeminiErrorArabic(err, false);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. Create & Edit Reel Background Images via gemini-nano-banana-2.1
  app.post('/api/ai/image', async (req, res) => {
    const { prompt, aspectRatio, imageSize, sourceImageBase64, sourceMimeType } =
      req.body || {};
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'يرجى كتابة وصف الخلفية المطلوبة.' });
      return;
    }

    const validRatios = new Set(['9:16', '1:1', '16:9', '3:4', '4:3']);
    const chosenRatio =
      typeof aspectRatio === 'string' && validRatios.has(aspectRatio)
        ? aspectRatio
        : '9:16';
    const validSizes = new Set(['1K', '2K']);
    const chosenSize =
      typeof imageSize === 'string' && validSizes.has(imageSize) ? imageSize : '1K';

    try {
      const ai = getGenAIClient();
      const parts: Array<Record<string, unknown>> = [];

      if (typeof sourceImageBase64 === 'string' && sourceImageBase64.trim()) {
        const cleanData = sourceImageBase64.includes(',')
          ? sourceImageBase64.split(',')[1]
          : sourceImageBase64;
        parts.push({
          inlineData: {
            mimeType:
              typeof sourceMimeType === 'string' && sourceMimeType.trim()
                ? sourceMimeType.trim()
                : 'image/png',
            data: cleanData,
          },
        });
      }

      parts.push({
        text: `${prompt.trim()} — serene contemplative background suitable for Quran recitation video, no text, no human faces, peaceful lighting`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: chosenRatio,
            imageSize: chosenSize,
          },
        },
      });

      let outputBase64: string | null = null;
      let outputMime = 'image/png';
      let noteText = '';

      const respParts = response.candidates?.[0]?.content?.parts || [];
      for (const part of respParts) {
        if (part.inlineData?.data) {
          outputBase64 = part.inlineData.data;
          outputMime = part.inlineData.mimeType || 'image/png';
        } else if (part.text) {
          noteText += part.text;
        }
      }

      if (!outputBase64) {
        res.status(502).json({
          error: 'لم يُرجع النموذج صورة في هذه المحاولة، جرّب وصفاً آخر أكثر وضوحاً.',
        });
        return;
      }

      res.json({
        imageUrl: `data:${outputMime};base64,${outputBase64}`,
        note: noteText.trim(),
      });
    } catch (err) {
      console.error('Gemini image error:', err);
      const formatted = formatGeminiErrorArabic(err, true);
      res.status(formatted.status).json({
        error: formatted.message,
        isPaidKeyRequired: formatted.isPaidKeyRequired,
      });
    }
  });

  // 4. Generate Video from Text or Animate Photo via gemini-omni-1.1-flash (Interactions API)
  app.post('/api/ai/video', async (req, res) => {
    const { prompt, aspectRatio, sourceImageBase64, sourceMimeType } = req.body || {};
    const hasImage =
      typeof sourceImageBase64 === 'string' && sourceImageBase64.trim().length > 0;
    const cleanPrompt =
      typeof prompt === 'string' && prompt.trim().length > 0
        ? prompt.trim()
        : hasImage
        ? 'تحريك سينمائي هادئ وبطيء يناسب خلفية تلاوة قرآنية خاشعة بدون نصوص أو أشخاص'
        : '';

    if (!cleanPrompt) {
      res.status(400).json({ error: 'يرجى كتابة وصف المشهد المتحرك أو إرفاق صورة لتحريكها.' });
      return;
    }

    const chosenRatio: '9:16' | '16:9' = aspectRatio === '16:9' ? '16:9' : '9:16';

    try {
      const ai = getGenAIClient();
      const inputPayload = hasImage
        ? [
            {
              type: 'image' as const,
              data: sourceImageBase64.includes(',')
                ? sourceImageBase64.split(',')[1]
                : sourceImageBase64,
              mime_type:
                typeof sourceMimeType === 'string' && sourceMimeType.trim()
                  ? sourceMimeType.trim()
                  : 'image/png',
            },
            {
              type: 'text' as const,
              text: `${cleanPrompt} — gentle atmospheric motion, no text overlays, no human figures`,
            },
          ]
        : `${cleanPrompt} — serene atmospheric nature or Islamic architectural light scene for Quran recitation reel, no text overlays, no human figures`;

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.1-flash',
          input: inputPayload as never,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: chosenRatio,
            duration: '5s',
            resolution: '720p',
          } as never,
        },
        { timeout: 300000 }
      );

      const interAny = interaction as unknown as {
        output_video?: { data?: string; uri?: string; mime_type?: string };
        outputs?: Array<{ type?: string; data?: string; uri?: string; mime_type?: string }>;
        steps?: Array<{
          step_type?: string;
          content?: Array<{ type?: string; data?: string; uri?: string; mime_type?: string }>;
        }>;
      };

      let videoBase64 = interAny.output_video?.data || null;
      let videoUri = interAny.output_video?.uri || null;
      let videoMime = interAny.output_video?.mime_type || 'video/mp4';

      if (!videoBase64 && !videoUri && Array.isArray(interAny.outputs)) {
        const vidOut = interAny.outputs.find((o) => o.type === 'video');
        if (vidOut) {
          videoBase64 = vidOut.data || null;
          videoUri = vidOut.uri || null;
          videoMime = vidOut.mime_type || 'video/mp4';
        }
      }

      if (!videoBase64 && !videoUri && Array.isArray(interAny.steps)) {
        for (const step of interAny.steps) {
          if (Array.isArray(step.content)) {
            const vidContent = step.content.find((c) => c.type === 'video');
            if (vidContent) {
              videoBase64 = vidContent.data || null;
              videoUri = vidContent.uri || null;
              videoMime = vidContent.mime_type || 'video/mp4';
              break;
            }
          }
        }
      }

      if (!videoBase64 && !videoUri) {
        res.status(502).json({
          error: 'اكتمل الطلب دون إرجاع مقطع فيديو، يرجى المحاولة بوصف مشهد طبيعي هادئ.',
        });
        return;
      }

      res.json({
        videoDataUrl: videoBase64 ? `data:${videoMime};base64,${videoBase64}` : null,
        videoUri,
        mimeType: videoMime,
      });
    } catch (err) {
      console.error('Gemini omni video error:', err);
      const formatted = formatGeminiErrorArabic(err, true);
      res.status(formatted.status).json({
        error: formatted.message,
        isPaidKeyRequired: formatted.isPaidKeyRequired,
      });
    }
  });

  // 5. Gemini 3.8 Live Voice Conversation WebSocket Bridge (/api/live)
  const liveWss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url?.split('?')[0] || '';
    if (pathname === '/api/live') {
      liveWss.handleUpgrade(request, socket, head, (ws) => {
        liveWss.emit('connection', ws, request);
      });
    }
  });

  liveWss.on('connection', (clientWs: WebSocket) => {
    let closed = false;
    const safeSend = (payload: Record<string, unknown>) => {
      if (!closed && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    let ai: GoogleGenAI;
    try {
      ai = getGenAIClient();
    } catch (err) {
      const formatted = formatGeminiErrorArabic(err, false);
      safeSend({ type: 'error', message: formatted.message });
      clientWs.close();
      return;
    }

    const sessionPromise = ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
        systemInstruction:
          'أنت مساعد صوتي قرآني هادئ ووقور في منصة قرآن ريلز. تحدّث بالعربية الفصحى الواضحة وبإيجاز مفيد لمساعدة المستخدم في اختيار السور والآيات وتدبر معانيها.',
      },
      callbacks: {
        onopen: () => {
          safeSend({ type: 'connected' });
        },
        onmessage: (msg) => {
          const sc = msg.serverContent;
          if (!sc) return;

          if (sc.interrupted) {
            safeSend({ type: 'interrupted' });
          }

          if (sc.inputTranscription?.text) {
            safeSend({
              type: 'inputTranscript',
              text: sc.inputTranscription.text,
            });
          }

          if (sc.outputTranscription?.text) {
            safeSend({
              type: 'outputTranscript',
              text: sc.outputTranscription.text,
            });
          }

          const parts = sc.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              safeSend({
                type: 'audio',
                data: part.inlineData.data,
              });
            }
          }
        },
        onerror: (err) => {
          console.error('Gemini Live session error:', err);
          safeSend({
            type: 'error',
            message: 'تعذر استمرار الاتصال الصوتي المباشر، يرجى إعادة المحاولة.',
          });
        },
        onclose: () => {
          safeSend({ type: 'closed' });
          if (!closed && clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        },
      },
    });

    sessionPromise.catch((err) => {
      const formatted = formatGeminiErrorArabic(err, false);
      safeSend({ type: 'error', message: formatted.message });
      if (!closed && clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });

    clientWs.on('message', (raw) => {
      try {
        const parsed = JSON.parse(String(raw)) as {
          type?: string;
          data?: string;
          text?: string;
        };
        if (parsed.type === 'audio' && typeof parsed.data === 'string') {
          sessionPromise
            .then((session) =>
              session.sendRealtimeInput({
                audio: {
                  data: parsed.data,
                  mimeType: 'audio/pcm;rate=16000',
                },
              })
            )
            .catch(() => {});
        } else if (parsed.type === 'text' && typeof parsed.text === 'string') {
          const clean = parsed.text.trim();
          if (clean) {
            sessionPromise
              .then((session) =>
                session.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: clean }] }],
                  turnComplete: true,
                })
              )
              .catch(() => {});
          }
        }
      } catch {
        // Ignore malformed frame
      }
    });

    clientWs.on('close', () => {
      closed = true;
      sessionPromise
        .then((session) => {
          session.close();
        })
        .catch(() => {});
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Quran Reels server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
