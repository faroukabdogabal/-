import { RECITERS, TRANSLATIONS } from '../data/quranCatalog';
import { SURAHS_FALLBACK } from '../data/surahsList';
import {
  PreparedReelData,
  ReciterOption,
  ReelChunk,
  SurahMeta,
  WordTiming,
} from '../types/quran';

interface QuranComWord {
  position: number;
  char_type_name: string;
  text_uthmani: string;
}

interface QuranComVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  words?: QuranComWord[];
  translations?: Array<{ text: string }>;
  audio?: {
    url: string;
    segments?: Array<number[]>;
  };
}

let cachedSurahs: SurahMeta[] | null = null;

export async function fetchSurahsList(): Promise<SurahMeta[]> {
  if (cachedSurahs) return cachedSurahs;
  try {
    const res = await fetch('https://api.quran.com/api/v4/chapters?language=ar');
    if (!res.ok) return SURAHS_FALLBACK;
    const data = await res.json();
    if (Array.isArray(data?.chapters) && data.chapters.length === 114) {
      cachedSurahs = data.chapters.map((ch: {
        id: number;
        name_arabic: string;
        name_simple: string;
        verses_count: number;
        revelation_place: string;
      }) => ({
        id: ch.id,
        nameArabic: ch.name_arabic,
        nameSimple: ch.name_simple,
        versesCount: ch.verses_count,
        revelationPlace: ch.revelation_place === 'madinah' ? 'madinah' : 'makkah',
      }));
      return cachedSurahs!;
    }
  } catch {
    // Fallback to embedded 114 Surahs list seamlessly
  }
  return SURAHS_FALLBACK;
}

function cleanTranslationHtml(raw: string): string {
  return raw
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

function buildAudioCandidates(
  reciter: ReciterOption,
  surahId: number,
  ayahNum: number,
  quranComRelativeUrl?: string
): string[] {
  const candidates: string[] = [];

  if (quranComRelativeUrl) {
    if (quranComRelativeUrl.startsWith('http')) {
      candidates.push(quranComRelativeUrl);
    } else if (quranComRelativeUrl.startsWith('//')) {
      candidates.push(`https:${quranComRelativeUrl}`);
    } else {
      candidates.push(`https://verses.quran.com/${quranComRelativeUrl.replace(/^\//, '')}`);
    }
  }

  candidates.push(
    `https://everyayah.com/data/${reciter.everyAyahFolder}/${pad3(surahId)}${pad3(ayahNum)}.mp3`
  );

  if (reciter.everyAyahFolder !== 'Alafasy_128kbps') {
    candidates.push(
      `https://everyayah.com/data/Alafasy_128kbps/${pad3(surahId)}${pad3(ayahNum)}.mp3`
    );
  }

  return candidates;
}

async function fetchAndDecodeAudioBuffer(
  audioCtx: AudioContext,
  candidateUrls: string[],
  signal?: AbortSignal
): Promise<AudioBuffer> {
  let lastError: Error | null = null;

  for (const remoteUrl of candidateUrls) {
    const proxyUrl = `/api/audio-proxy?url=${encodeURIComponent(remoteUrl)}`;
    const attempts = [remoteUrl, proxyUrl];

    for (const url of attempts) {
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) continue;
        const ctype = (res.headers.get('content-type') || '').toLowerCase();
        if (ctype.includes('text/html') || ctype.includes('application/json')) continue;
        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf.byteLength < 512) continue;
        const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
        return decoded;
      } catch (err) {
        if (signal?.aborted) throw err;
        lastError = err instanceof Error ? err : new Error('Failed decoding audio');
      }
    }
  }

  throw lastError || new Error('تعذر تحميل الملف الصوتي للتلاوة المختارة');
}

/**
 * Analyzes actual PCM waveform energy in 20ms windows to detect the exact
 * voice onset and voice offset of a single-verse AudioBuffer.
 */
function detectSpeechBoundsSec(buf: AudioBuffer): {
  speechStartSec: number;
  speechEndSec: number;
} {
  const ch = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const totalSec = buf.duration;
  if (totalSec <= 0.25 || ch.length === 0) {
    return { speechStartSec: 0, speechEndSec: totalSec };
  }

  const winSamples = Math.max(1, Math.floor(sr * 0.02)); // 20ms window
  const numWins = Math.floor(ch.length / winSamples);
  if (numWins < 4) {
    return { speechStartSec: 0, speechEndSec: totalSec };
  }

  const rmsList = new Float32Array(numWins);
  let peakRms = 0;

  for (let w = 0; w < numWins; w++) {
    let sumSq = 0;
    const base = w * winSamples;
    for (let i = 0; i < winSamples; i++) {
      const v = ch[base + i];
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / winSamples);
    rmsList[w] = rms;
    if (rms > peakRms) peakRms = rms;
  }

  if (peakRms < 0.002) {
    return { speechStartSec: 0, speechEndSec: totalSec };
  }

  const threshold = Math.max(0.004, peakRms * 0.065);
  let firstWin = 0;
  for (let w = 0; w < numWins; w++) {
    if (rmsList[w] >= threshold) {
      firstWin = w;
      break;
    }
  }

  let lastWin = numWins - 1;
  for (let w = numWins - 1; w >= firstWin; w--) {
    if (rmsList[w] >= threshold) {
      lastWin = w;
      break;
    }
  }

  const startSec = Math.max(0, (firstWin * winSamples) / sr - 0.03);
  const endSec = Math.min(totalSec, ((lastWin + 1) * winSamples) / sr + 0.05);

  if (endSec - startSec < 0.2) {
    return { speechStartSec: 0, speechEndSec: totalSec };
  }
  return { speechStartSec: startSec, speechEndSec: endSec };
}

function concatenateAudioBuffers(
  buffers: AudioBuffer[],
  gapSec = 0.16
): { combined: AudioBuffer; offsetsSec: number[] } {
  const sampleRate = 44100;
  const gapSamples = Math.floor(gapSec * sampleRate);
  let totalLength = 0;
  const offsetsSec: number[] = [];

  buffers.forEach((buf, idx) => {
    offsetsSec.push(totalLength / sampleRate);
    const resampledLen = Math.ceil((buf.length * sampleRate) / buf.sampleRate);
    totalLength += resampledLen;
    if (idx < buffers.length - 1) {
      totalLength += gapSamples;
    }
  });

  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  const offline = new OfflineCtx(2, Math.max(totalLength, 1), sampleRate);
  const outputBuffer = offline.createBuffer(2, Math.max(totalLength, 1), sampleRate);

  const outL = outputBuffer.getChannelData(0);
  const outR = outputBuffer.getChannelData(1);

  let writeCursor = 0;
  buffers.forEach((buf, idx) => {
    const inL = buf.getChannelData(0);
    const inR = buf.numberOfChannels > 1 ? buf.getChannelData(1) : inL;
    const ratio = buf.sampleRate / sampleRate;
    const targetLen = Math.ceil((buf.length * sampleRate) / buf.sampleRate);

    for (let i = 0; i < targetLen && writeCursor + i < outputBuffer.length; i++) {
      const srcIdx = Math.min(Math.floor(i * ratio), buf.length - 1);
      outL[writeCursor + i] = inL[srcIdx];
      outR[writeCursor + i] = inR[srcIdx];
    }

    writeCursor += targetLen;
    if (idx < buffers.length - 1) {
      writeCursor += gapSamples;
    }
  });

  return { combined: outputBuffer, offsetsSec };
}

function toArabicIndicDigits(num: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((c) => digits[Number(c)] ?? c)
    .join('');
}

const PAUSE_MARKS = /[ۖۗۚۛۙ]/;

function buildVerseChunks(
  verse: QuranComVerse,
  surahId: number,
  verseStartSec: number,
  verseBuffer: AudioBuffer,
  autoSplit: boolean
): ReelChunk[] {
  const verseDurationSec = verseBuffer.duration;
  const spokenWordsRaw = (verse.words || []).filter((w) => w.char_type_name === 'word');
  const translationClean =
    verse.translations && verse.translations.length > 0
      ? cleanTranslationHtml(verse.translations[0].text)
      : '';

  const fallbackTokens =
    spokenWordsRaw.length > 0
      ? spokenWordsRaw.map((w, idx) => ({
          position: w.position || idx + 1,
          text: w.text_uthmani,
        }))
      : verse.text_uthmani
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((t, idx) => ({ position: idx + 1, text: t }));

  // Parse Quran.com v4 word segments:
  // Note: Quran.com v4 segments have 4 numbers: [wordZeroIdx, wordOneBasedPos, startMs, endMs]
  // while QDC/v3 segments have 3 numbers: [wordOneBasedPos, startMs, endMs]
  const rawSegments = verse.audio?.segments || [];
  const segmentMap = new Map<number, { startMs: number; endMs: number }>();

  let maxSegMs = 0;
  for (const seg of rawSegments) {
    if (!Array.isArray(seg) || seg.length < 3) continue;

    let wordPos: number;
    let startMs: number;
    let endMs: number;

    if (seg.length >= 4) {
      wordPos = Number(seg[1]);
      startMs = Number(seg[2]);
      endMs = Number(seg[3]);
    } else {
      wordPos = Number(seg[0]);
      startMs = Number(seg[1]);
      endMs = Number(seg[2]);
    }

    if (
      Number.isFinite(wordPos) &&
      Number.isFinite(startMs) &&
      Number.isFinite(endMs) &&
      startMs >= 0 &&
      endMs > startMs
    ) {
      segmentMap.set(wordPos, { startMs, endMs });
      if (endMs > maxSegMs) maxSegMs = endMs;
    }
  }

  const wordTimings: WordTiming[] = [];

  if (segmentMap.size >= Math.max(1, Math.floor(fallbackTokens.length * 0.6)) && maxSegMs > 150) {
    // Scale only if segment timestamps exceed actual decoded buffer duration
    const durationMs = verseDurationSec * 1000;
    const scale = maxSegMs > durationMs * 1.04 ? durationMs / maxSegMs : 1.0;

    let prevEnd = verseStartSec;
    fallbackTokens.forEach((tok, idx) => {
      const seg = segmentMap.get(tok.position) || segmentMap.get(idx + 1);
      let s = prevEnd;
      let e = Math.min(verseStartSec + verseDurationSec, prevEnd + 0.35);

      if (seg) {
        s = verseStartSec + (seg.startMs * scale) / 1000;
        e = verseStartSec + (seg.endMs * scale) / 1000;
      }
      if (e <= s) {
        e = s + 0.12;
      }
      prevEnd = e;
      wordTimings.push({
        text: tok.text,
        isEndMarker: false,
        startSec: s,
        endSec: e,
      });
    });
  } else {
    // Align to actual PCM speech onset & offset of the decoded verse AudioBuffer
    const { speechStartSec, speechEndSec } = detectSpeechBoundsSec(verseBuffer);
    const activeSpeechDur = Math.max(0.2, speechEndSec - speechStartSec);

    const weights = fallbackTokens.map((tok) => {
      const baseLen = tok.text.replace(/[\u064B-\u065F\u0670]/g, '').length;
      const maddBonus = (tok.text.match(/[آأإاويى]/g) || []).length * 0.75;
      const shaddahBonus = (tok.text.match(/\u0651/g) || []).length * 0.45;
      const pauseBonus = PAUSE_MARKS.test(tok.text) ? 1.6 : 0;
      return Math.max(1.2, baseLen + maddBonus + shaddahBonus + pauseBonus);
    });
    const totalWeight = weights.reduce((acc, v) => acc + v, 0) || 1;
    let cursor = verseStartSec + speechStartSec;

    fallbackTokens.forEach((tok, i) => {
      const dur = (weights[i] / totalWeight) * activeSpeechDur;
      wordTimings.push({
        text: tok.text,
        isEndMarker: false,
        startSec: cursor,
        endSec: cursor + dur,
      });
      cursor += dur;
    });
  }

  const endMarkerText = `﴿${toArabicIndicDigits(verse.verse_number)}﴾`;
  const lastWordEnd =
    wordTimings.length > 0
      ? wordTimings[wordTimings.length - 1].endSec
      : verseStartSec + verseDurationSec;

  const MAX_WORDS_PER_SCREEN = 12;
  if (!autoSplit || wordTimings.length <= MAX_WORDS_PER_SCREEN) {
    const allWords: WordTiming[] = [
      ...wordTimings,
      {
        text: endMarkerText,
        isEndMarker: true,
        startSec: Math.max(verseStartSec, lastWordEnd - 0.12),
        endSec: verseStartSec + verseDurationSec,
      },
    ];

    return [
      {
        id: `${surahId}:${verse.verse_number}:0`,
        surahNumber: surahId,
        ayahNumber: verse.verse_number,
        arabicText: allWords.map((w) => w.text).join(' '),
        translationText: translationClean,
        startSec: verseStartSec,
        endSec: verseStartSec + verseDurationSec,
        words: allWords,
      },
    ];
  }

  const groups: WordTiming[][] = [];
  let currentGroup: WordTiming[] = [];

  wordTimings.forEach((w, idx) => {
    currentGroup.push(w);
    const remaining = wordTimings.length - 1 - idx;
    const hasPause = PAUSE_MARKS.test(w.text) && currentGroup.length >= 5;
    const reachedLimit = currentGroup.length >= 10 && remaining >= 4;

    if ((hasPause || reachedLimit) && remaining > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  });
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const transWords = translationClean ? translationClean.split(/\s+/) : [];
  let transCursor = 0;

  return groups.map((grp, gIdx) => {
    const isLastGroup = gIdx === groups.length - 1;
    const grpLastEnd = grp[grp.length - 1].endSec;
    const chunkWords = isLastGroup
      ? [
          ...grp,
          {
            text: endMarkerText,
            isEndMarker: true,
            startSec: Math.max(grp[0].startSec, grpLastEnd - 0.12),
            endSec: verseStartSec + verseDurationSec,
          },
        ]
      : grp;

    const cStart = gIdx === 0 ? verseStartSec : grp[0].startSec;
    const cEnd = isLastGroup
      ? verseStartSec + verseDurationSec
      : groups[gIdx + 1][0].startSec;

    let chunkTrans = '';
    if (transWords.length > 0) {
      if (isLastGroup) {
        chunkTrans = transWords.slice(transCursor).join(' ');
      } else {
        const share = Math.max(
          2,
          Math.round((grp.length / wordTimings.length) * transWords.length)
        );
        chunkTrans = transWords.slice(transCursor, transCursor + share).join(' ');
        transCursor += share;
      }
    }

    return {
      id: `${surahId}:${verse.verse_number}:${gIdx}`,
      surahNumber: surahId,
      ayahNumber: verse.verse_number,
      arabicText: chunkWords.map((w) => w.text).join(' '),
      translationText: chunkTrans,
      startSec: cStart,
      endSec: Math.max(cStart + 0.15, cEnd),
      words: chunkWords,
    };
  });
}

export async function loadAndPrepareReelData(params: {
  surahId: number;
  fromAyah: number;
  toAyah: number;
  reciterId: string;
  translationId: string;
  autoSplitLongAyahs: boolean;
  onStatus?: (msg: string) => void;
  signal?: AbortSignal;
}): Promise<PreparedReelData> {
  const {
    surahId,
    fromAyah,
    toAyah,
    reciterId,
    translationId,
    autoSplitLongAyahs,
    onStatus,
    signal,
  } = params;

  const surahs = await fetchSurahsList();
  const surah = surahs.find((s) => s.id === surahId) || SURAHS_FALLBACK[0];
  const reciter = RECITERS.find((r) => r.id === reciterId) || RECITERS[0];
  const translation = TRANSLATIONS.find((t) => t.id === translationId) || TRANSLATIONS[0];

  const validFrom = Math.max(1, Math.min(fromAyah, surah.versesCount));
  const validTo = Math.max(validFrom, Math.min(toAyah, surah.versesCount, validFrom + 29));
  const count = validTo - validFrom + 1;

  onStatus?.('جاري جلب النص القرآني بالرسم العثماني...');

  const queryParams = new URLSearchParams({
    language: 'ar',
    words: 'true',
    fields: 'text_uthmani',
    word_fields: 'text_uthmani',
    per_page: '300',
  });

  if (translation.quranComTranslationId) {
    queryParams.set('translations', String(translation.quranComTranslationId));
  }
  if (reciter.quranComId) {
    queryParams.set('audio', String(reciter.quranComId));
  }

  const versesRes = await fetch(
    `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?${queryParams.toString()}`,
    { signal }
  );

  if (!versesRes.ok) {
    throw new Error('تعذر الاتصال بخادم المصحف الشريف، يرجى المحاولة مرة أخرى');
  }

  const versesJson = await versesRes.json();
  const allChapterVerses: QuranComVerse[] = versesJson.verses || [];
  const selectedVerses = allChapterVerses.filter(
    (v) => v.verse_number >= validFrom && v.verse_number <= validTo
  );

  if (selectedVerses.length === 0) {
    throw new Error('لم يتم العثور على الآيات المحددة');
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const tempAudioCtx = new AudioCtx();

  try {
    const decodedBuffers: AudioBuffer[] = [];

    for (let i = 0; i < selectedVerses.length; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const v = selectedVerses[i];
      onStatus?.(`جاري تحميل تلاوة الآية ${v.verse_number} (${i + 1} من ${count})...`);

      const candidates = buildAudioCandidates(
        reciter,
        surahId,
        v.verse_number,
        reciter.quranComId ? v.audio?.url : undefined
      );
      const buf = await fetchAndDecodeAudioBuffer(tempAudioCtx, candidates, signal);
      decodedBuffers.push(buf);
    }

    onStatus?.('جاري مزامنة ظهور الكلمات مع نطق القارئ...');

    const { combined, offsetsSec } = concatenateAudioBuffers(decodedBuffers, 0.16);
    const allChunks: ReelChunk[] = [];

    selectedVerses.forEach((verse, idx) => {
      const vStart = offsetsSec[idx];
      const vBuf = decodedBuffers[idx];
      const verseChunks = buildVerseChunks(
        verse,
        surahId,
        vStart,
        vBuf,
        autoSplitLongAyahs
      );
      allChunks.push(...verseChunks);
    });

    return {
      surah,
      reciter,
      fromAyah: validFrom,
      toAyah: validTo,
      audioBuffer: combined,
      totalDurationSec: combined.duration,
      chunks: allChunks,
    };
  } finally {
    await tempAudioCtx.close().catch(() => {});
  }
}
