const pdfParse = require("pdf-parse");

function chunkText(text, chunkSize = 800, overlap = 100) {
  const chunks = [];
  let i = 0;
  const clean = text.replace(/\s+/g, " ").trim();
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

async function parsePdfBuffer(buffer) {
  const pdfData = await pdfParse(buffer);
  return pdfData.text || "";
}

module.exports = { chunkText, parsePdfBuffer };
