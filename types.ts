
export enum Language {
  Bengali = 'bn',
  English = 'en',
  Hindi = 'hi',
  Spanish = 'es',
  French = 'fr',
  German = 'de',
  Japanese = 'ja',
  Arabic = 'ar',
  Chinese = 'zh',
  Portuguese = 'pt',
  Russian = 'ru',
  Korean = 'ko',
  Italian = 'it',
  Turkish = 'tr',
  Vietnamese = 'vi',
  Thai = 'th',
  Dutch = 'nl',
  Polish = 'pl',
  Indonesian = 'id',
  Urdu = 'ur',
  Persian = 'fa',
  Greek = 'el',
  Hebrew = 'he',
  Swedish = 'sv',
  Norwegian = 'no',
  Danish = 'da',
  Finnish = 'fi',
  Romanian = 'ro',
  Hungarian = 'hu',
  Czech = 'cs',
  Slovak = 'sk',
  Ukrainian = 'uk',
  Bulgarian = 'bg',
  Croatian = 'hr',
  Serbian = 'sr',
  Malay = 'ms',
  Tamil = 'ta',
  Telugu = 'te',
  Marathi = 'mr',
  Gujarati = 'gu',
  Kannada = 'kn',
  Malayalam = 'ml',
  Punjabi = 'pa'
}

export const LanguageNames: Record<Language, string> = {
  [Language.Bengali]: 'বাংলা (Bengali)',
  [Language.English]: 'English',
  [Language.Hindi]: 'हिन्दी (Hindi)',
  [Language.Spanish]: 'Español (Spanish)',
  [Language.French]: 'Français (French)',
  [Language.German]: 'Deutsch (German)',
  [Language.Japanese]: '日本語 (Japanese)',
  [Language.Arabic]: 'العربية (Arabic)',
  [Language.Chinese]: '中文 (Chinese)',
  [Language.Portuguese]: 'Português (Portuguese)',
  [Language.Russian]: 'Русский (Russian)',
  [Language.Korean]: '한국어 (Korean)',
  [Language.Italian]: 'Italiano (Italian)',
  [Language.Turkish]: 'Türkçe (Turkish)',
  [Language.Vietnamese]: 'Tiếng Việt (Vietnamese)',
  [Language.Thai]: 'ไทย (Thai)',
  [Language.Dutch]: 'Nederlands (Dutch)',
  [Language.Polish]: 'Polski (Polish)',
  [Language.Indonesian]: 'Bahasa Indonesia (Indonesian)',
  [Language.Urdu]: 'اردو (Urdu)',
  [Language.Persian]: 'ফারসী (Persian)',
  [Language.Greek]: 'Ελληνικά (Greek)',
  [Language.Hebrew]: 'עברית (Hebrew)',
  [Language.Swedish]: 'Svenska (Swedish)',
  [Language.Norwegian]: 'Norsk (Norwegian)',
  [Language.Danish]: 'Dansk (Danish)',
  [Language.Finnish]: 'Suomi (Finnish)',
  [Language.Romanian]: 'Română (Romanian)',
  [Language.Hungarian]: 'Magyar (Hungarian)',
  [Language.Czech]: 'Čeština (Czech)',
  [Language.Slovak]: 'Slovenčina (Slovak)',
  [Language.Ukrainian]: 'Українська (Ukrainian)',
  [Language.Bulgarian]: 'Български (Bulgarian)',
  [Language.Croatian]: 'Hrvatski (Croatian)',
  [Language.Serbian]: 'Српски (Serbian)',
  [Language.Malay]: 'Bahasa Melayu (Malay)',
  [Language.Tamil]: 'தமிழ் (Tamil)',
  [Language.Telugu]: 'తెలుగు (Telugu)',
  [Language.Marathi]: 'मরাঠি (Marathi)',
  [Language.Gujarati]: 'ગુજરાતી (Gujarati)',
  [Language.Kannada]: 'ಕನ್ನಡ (Kannada)',
  [Language.Malayalam]: 'മലയാളം (Malayalam)',
  [Language.Punjabi]: 'ਪੰਜਾਬੀ (Punjabi)'
};

export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export interface ProcessingState {
  isProcessing: boolean;
  status: string;
  progress: number;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  srtSubtitles?: string;
  audioUrl?: string;
  sourceLang: Language;
  targetLang: Language;
}
