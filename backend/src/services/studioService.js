const OPENAI_TTS_VOICES = [
  {
    id: 'female_soft',
    label: 'Kadın sesi - sıcak ve akıcı',
    voice: 'nova',
    description: 'Masal, uyku anlatısı ve sıcak anlatıcı tonu için önerilir.'
  },
  {
    id: 'female_calm',
    label: 'Kadın sesi - sakin ve yumuşak',
    voice: 'shimmer',
    description: 'Yavaş, dingin, uyku öncesi içerikler için uygundur.'
  },
  {
    id: 'male_deep',
    label: 'Erkek sesi - tok ve güvenli',
    voice: 'onyx',
    description: 'Yetişkin hikâye, belgesel anlatı ve güçlü anlatıcı için uygundur.'
  },
  {
    id: 'male_natural',
    label: 'Erkek sesi - doğal ve akıcı',
    voice: 'echo',
    description: 'Genel anlatım, sesli tiyatro ve aile içerikleri için uygundur.'
  },
  {
    id: 'neutral_story',
    label: 'Nötr anlatıcı - hikâye tonu',
    voice: 'alloy',
    description: 'Genel amaçlı anlatıcı sesi.'
  },
  {
    id: 'character_story',
    label: 'Karakterli anlatım',
    voice: 'fable',
    description: 'Masalsı veya dramatize anlatım için denenebilir.'
  }
];

function getVoiceProfile(profileIdOrVoice) {
  const selected = OPENAI_TTS_VOICES.find((item) => item.id === profileIdOrVoice || item.voice === profileIdOrVoice);
  return selected || OPENAI_TTS_VOICES[0];
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

function stripProductionNotes(text) {
  return normalizeWhitespace(text)
    .replace(/^\s*\[[^\]]{0,240}\]\s*$/gm, '')
    .replace(/\[[^\]]{0,180}\]/g, '')
    .replace(/^\s*(Anlatıcı|Narrator)\s*[-–:]\s*/gim, '')
    .replace(/^\s*(Kısa duraklama|Uzun duraklama|Fon müziği|Efekt|SFX)\s*[:\-–]?.*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function removePdfNoise(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/^\s*(sayfa|page)\s*\d+\s*$/gim, '')
    .replace(/^\s*\d+\s*$/gm, '')
    .replace(/([^\n])\n\s*([a-zçğıöşü])/g, '$1 $2')
    .replace(/([A-Za-zÇĞİÖŞÜçğıöşü])-\s*\n\s*([A-Za-zÇĞİÖŞÜçğıöşü])/g, '$1$2')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeTurkishPunctuation(text) {
  return String(text || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])(?=\S)/g, '$1 ')
    .replace(/\.{3,}/g, '…')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitLongSentence(sentence, maxLen = 220) {
  const clean = sentence.trim();
  if (clean.length <= maxLen) return clean;
  const parts = clean.split(/(,|;|:| ve | ama | fakat | çünkü | sonra )/gi);
  const lines = [];
  let current = '';
  for (const part of parts) {
    const candidate = (current + part).trim();
    if (candidate.length > maxLen && current.trim()) {
      lines.push(current.trim());
      current = part.trim();
    } else {
      current = candidate;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.join('\n');
}

function addNaturalLineBreaks(text, pauseLevel = 'normal') {
  const normalized = normalizeTurkishPunctuation(removePdfNoise(text));
  const paragraphBreak = pauseLevel === 'long' ? '\n\n' : '\n';
  return normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph
      .split(/(?<=[.!?…])\s+/u)
      .map((sentence) => splitLongSentence(sentence))
      .filter(Boolean)
      .join(paragraphBreak)
    )
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

function makeSpeechReadyText(rawText, options = {}) {
  const style = options.style || 'natural';
  const pauseLevel = options.pause_level || options.pauseLevel || (style === 'bedtime' ? 'long' : 'normal');
  const base = stripProductionNotes(rawText);
  let prepared = addNaturalLineBreaks(base, pauseLevel);

  prepared = prepared.replace(/^([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü .'-]{1,36}):\s*/gm, '$1:\n');

  if (style === 'bedtime' || options.audienceType === 'child') {
    prepared = prepared.replace(/!+/g, '.').replace(/\?+/g, '?');
  }

  return prepared.trim();
}

function estimateSpeechQuality(text, options = {}) {
  const prepared = makeSpeechReadyText(text, options);
  const warnings = [];
  const words = countWords(prepared);
  const veryLongLines = prepared.split('\n').filter((line) => line.trim().length > 260).length;
  const weirdChars = (prepared.match(/\uFFFD/g) || []).length;
  if (words < 20) warnings.push('Seslendirilecek metin çok kısa görünüyor.');
  if (veryLongLines > 0) warnings.push(
    veryLongLines + ' uzun satır var; okuma nefesi doğal olmayabilir.'
  );
  if (weirdChars > 0) warnings.push('Bozuk karakter tespit edildi; PDF metni kontrol edilmeli.');
  if (/\b(www\.|http|https)\b/i.test(prepared)) warnings.push('Link/URL metni var; seslendirmede kötü duyulabilir.');
  return { prepared_text: prepared, chars: prepared.length, words, warnings };
}

function countWords(text) {
  const matches = normalizeWhitespace(text).match(/[\p{L}\p{N}’'-]+/gu);
  return matches ? matches.length : 0;
}

function estimateDurationSeconds(text, wordsPerMinute = 135) {
  const words = countWords(text);
  if (!words) return 0;
  return Math.max(10, Math.round((words / wordsPerMinute) * 60));
}

function formatDuration(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${minutes}:${String(rem).padStart(2, '0')}`;
}

function detectPotentialIssues(text, audienceType = 'family') {
  const cleaned = normalizeWhitespace(text);
  const lower = cleaned.toLocaleLowerCase('tr-TR');
  const warnings = [];

  if (!cleaned) warnings.push('Metin boş görünüyor. PDF taranmış görsel olabilir; OCR gerekebilir.');
  if (cleaned.length < 500) warnings.push('Bölüm çok kısa. PDF metni eksik çıkmış olabilir.');
  if ((cleaned.match(/\uFFFD/g) || []).length > 3) warnings.push('Bozuk karakterler tespit edildi. PDF metni manuel kontrol edilmeli.');
  if (/\b(page|sayfa)\s*\d+\b/iu.test(cleaned)) warnings.push('Sayfa numarası / üst bilgi kalıntıları olabilir.');
  if (/[A-Za-zÇĞİÖŞÜçğıöşü]-\s+[A-Za-zÇĞİÖŞÜçğıöşü]/u.test(cleaned)) warnings.push('Satır sonu tire bölünmeleri olabilir.');

  const intenseTerms = ['öldü', 'kan', 'korkunç', 'şiddet', 'savaş', 'cinayet', 'intihar', 'uyuşturucu', 'cinsel'];
  const foundTerms = intenseTerms.filter((term) => lower.includes(term));
  if (audienceType === 'child' && foundTerms.length > 0) {
    warnings.push(`Çocuk içeriği için hassas kelimeler var: ${foundTerms.slice(0, 4).join(', ')}`);
  }

  return warnings;
}

function analyzeEpisode(episode, audienceType = 'family') {
  const raw = episode.raw_text || '';
  const script = episode.narration_script || raw;
  const words = countWords(raw);
  const scriptWords = countWords(stripProductionNotes(script));
  const chars = raw.length;
  const paragraphs = raw.split(/\n\s*\n/).filter((part) => part.trim()).length;
  const dialogueLines = raw.split('\n').filter((line) => /(^|\s)[“\"].+[”\"]|^[A-ZÇĞİÖŞÜ][^:]{1,30}:/.test(line.trim())).length;
  const estimatedSeconds = estimateDurationSeconds(script || raw);
  const warnings = detectPotentialIssues(raw, audienceType);

  return {
    episode_id: episode.id,
    title: episode.title,
    episode_no: episode.episode_no,
    chars,
    words,
    script_words: scriptWords,
    paragraphs,
    dialogue_lines: dialogueLines,
    estimated_duration_seconds: estimatedSeconds,
    estimated_duration_label: formatDuration(estimatedSeconds),
    warnings,
    has_audio: Boolean(episode.audio_url),
    status: episode.status
  };
}

function analyzeContent(content, episodes) {
  const episodeAnalyses = episodes.map((episode) => analyzeEpisode(episode, content.audience_type));
  const totals = episodeAnalyses.reduce(
    (acc, item) => {
      acc.chars += item.chars;
      acc.words += item.words;
      acc.estimated_duration_seconds += item.estimated_duration_seconds;
      acc.warning_count += item.warnings.length;
      if (item.has_audio) acc.audio_count += 1;
      return acc;
    },
    { chars: 0, words: 0, estimated_duration_seconds: 0, warning_count: 0, audio_count: 0 }
  );

  return {
    content_id: content.id,
    title: content.title,
    audience_type: content.audience_type,
    episode_count: episodes.length,
    totals: {
      ...totals,
      estimated_duration_label: formatDuration(totals.estimated_duration_seconds)
    },
    episodes: episodeAnalyses
  };
}

function createEnhancedNarrationScript(rawText, options = {}) {
  const audienceType = options.audienceType || 'family';
  const style = options.style || 'natural';
  const voiceProfile = getVoiceProfile(options.voiceProfile || options.voice || 'female_soft');
  const cleaned = makeSpeechReadyText(rawText, { audienceType, style, pause_level: options.pause_level || options.pauseLevel });

  const audienceTone = audienceType === 'child'
    ? 'sıcak, güvenli, çocuklara uygun, yavaş ve net'
    : audienceType === 'adult'
      ? 'doğal, akıcı, edebi ve dingin'
      : 'sıcak, aileye uygun, anlaşılır ve akıcı';

  const styleTone = {
    bedtime: 'uyku öncesi; daha yavaş tempo, yumuşak geçişler, sakin vurgu',
    theatrical: 'sesli tiyatro; karakterlerde hafif ayrışan ton, duygulu ama abartısız',
    educational: 'eğitici; açık, net, ritmik ve anlaşılır',
    natural: 'doğal hikâye anlatımı; konuşur gibi ve akıcı'
  }[style] || 'doğal hikâye anlatımı; konuşur gibi ve akıcı';

  const intro = [
    `[Prodüksiyon notu: ${voiceProfile.label}]`,
    `[Anlatıcı tonu: ${audienceTone}]`,
    `[Akış: ${styleTone}]`,
    '[Duraklama: paragraf sonlarında kısa nefes; bölüm geçişlerinde 1 saniye sakin boşluk]'
  ].join('\n');

  return `${intro}\n\n${cleaned}`.trim();
}

module.exports = {
  OPENAI_TTS_VOICES,
  getVoiceProfile,
  normalizeWhitespace,
  stripProductionNotes,
  removePdfNoise,
  makeSpeechReadyText,
  estimateSpeechQuality,
  estimateDurationSeconds,
  formatDuration,
  analyzeEpisode,
  analyzeContent,
  createEnhancedNarrationScript
};
