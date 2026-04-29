const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const { cleanExtractedPdfText } = require('./textTools');

async function extractTextFromPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const parsed = await pdfParse(buffer);
  return {
    text: cleanExtractedPdfText(parsed.text),
    pageCount: parsed.numpages || null,
    info: parsed.info || null
  };
}

module.exports = { extractTextFromPdf };
