function cleanExtractedPdfText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/-\n(?=\p{L})/gu, '')
    .replace(/\n(?=\p{Ll})/gu, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function splitTextIntoEpisodes(text, options = {}) {
  const maxChars = options.maxChars || 4500;
  const minChars = options.minChars || 1600;
  const cleaned = cleanExtractedPdfText(text);

  if (!cleaned) return [];

  const chapterMatches = [...cleaned.matchAll(/(?:^|\n)(Bölüm|Chapter|Kısım|Part)\s+([0-9IVXLCDM]+|[A-Za-zÇĞİÖŞÜçğıöşü]+).*?(?=\n)/gim)];
  if (chapterMatches.length >= 2) {
    const episodes = [];
    for (let i = 0; i < chapterMatches.length; i += 1) {
      const start = chapterMatches[i].index;
      const end = chapterMatches[i + 1]?.index || cleaned.length;
      const chunk = cleaned.slice(start, end).trim();
      const titleLine = chunk.split('\n')[0].trim().slice(0, 120);
      if (chunk.length > 100) {
        episodes.push({ title: titleLine || `Bölüm ${episodes.length + 1}`, text: chunk });
      }
    }
    if (episodes.length > 0) return episodes;
  }

  const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const episodes = [];
  let buffer = '';

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && buffer.length >= minChars) {
      episodes.push({ title: `Bölüm ${episodes.length + 1}`, text: buffer.trim() });
      buffer = paragraph;
    } else {
      buffer = candidate;
    }
  }

  if (buffer.trim()) {
    episodes.push({ title: `Bölüm ${episodes.length + 1}`, text: buffer.trim() });
  }

  return episodes;
}

function createNarrationScript(rawText, audienceType = 'family') {
  const intro = audienceType === 'child'
    ? '[Anlatıcı: sıcak, sakin, yavaş ve güven verici bir ton]\n'
    : audienceType === 'adult'
      ? '[Anlatıcı: doğal, akıcı, dingin ve edebi bir ton]\n'
      : '[Anlatıcı: doğal, sıcak ve her yaşa uygun bir ton]\n';

  return `${intro}${String(rawText || '').trim()}`.trim();
}

module.exports = { cleanExtractedPdfText, splitTextIntoEpisodes, createNarrationScript };
