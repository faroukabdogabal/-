export enum VideoAspectRatio {
  Vertical9x16 = '9:16',
  Square1x1 = '1:1',
  Landscape16x9 = '16:9',
}

export enum ParticleEffect {
  Dust = 'dust',
  Rain = 'rain',
  None = 'none',
}

export enum ExportResolution {
  HD720 = '720p',
}

export enum WordRevealMode {
  Progressive = 'progressive',
  HighlightFull = 'highlight',
  StaticFull = 'static',
}

export interface SurahMeta {
  id: number;
  nameArabic: string;
  nameSimple: string;
  versesCount: number;
  revelationPlace: 'makkah' | 'madinah';
}

export interface ReciterOption {
  id: string;
  nameArabic: string;
  styleArabic: string;
  everyAyahFolder: string;
  quranComId?: number;
}

export interface TranslationOption {
  id: string;
  quranComTranslationId: number | null;
  labelArabic: string;
  languageName: string;
  dir: 'rtl' | 'ltr';
}

export interface BackgroundPreset {
  id: string;
  titleArabic: string;
  category: 'photo' | 'animated';
  imageUrl?: string;
  fallbackGradient: [string, string, string];
  animatedVariant?: 'stars' | 'dawn' | 'noor';
}

export interface FontOption {
  id: string;
  labelArabic: string;
  fontFamily: string;
}

export interface WordTiming {
  text: string;
  isEndMarker: boolean;
  startSec: number;
  endSec: number;
}

export interface ReelChunk {
  id: string;
  ayahNumber: number;
  surahNumber: number;
  arabicText: string;
  translationText: string;
  startSec: number;
  endSec: number;
  words: WordTiming[];
}

export interface PreparedReelData {
  surah: SurahMeta;
  reciter: ReciterOption;
  fromAyah: number;
  toAyah: number;
  audioBuffer: AudioBuffer;
  totalDurationSec: number;
  chunks: ReelChunk[];
}

export interface StudioSettings {
  surahId: number;
  fromAyah: number;
  toAyah: number;
  reciterId: string;
  translationId: string;
  backgroundId: string;
  customBgType: 'none' | 'image' | 'video';
  customBgUrl: string | null;
  aspectRatio: VideoAspectRatio;
  resolution: ExportResolution;
  dimming: number; // 0.2 to 0.88
  kenBurnsMotion: boolean;
  particleEffect: ParticleEffect;
  fontId: string;
  arabicFontSize: number; // scale multiplier 0.8 to 1.35
  translationFontSize: number; // scale multiplier 0.8 to 1.3
  wordRevealMode: WordRevealMode;
  highlightColor: string;
  textColor: string;
  autoSplitLongAyahs: boolean;
  showSurahHeader: boolean;
  showReciterFooter: boolean;
  showProgressBar: boolean;
  sadaqahText: string;
}

export interface QuickPreset {
  id: string;
  titleArabic: string;
  subtitleArabic: string;
  surahId: number;
  fromAyah: number;
  toAyah: number;
  reciterId: string;
  backgroundId: string;
}

export interface ExportProgressState {
  status: 'idle' | 'preparing' | 'rendering' | 'muxing' | 'done' | 'error';
  percent: number;
  message: string;
  errorDetail?: string;
}
