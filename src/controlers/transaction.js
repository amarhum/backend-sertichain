const tesseract = require("tesseract.js");
const poppler = require("pdf-poppler");
const path = require("path");
const fs = require("fs");
const os = require("os");
const sharp = require("sharp");
const { performance } = require('perf_hooks');
const modelTransaction = require("../models/transaction");

function cleanLine(line) {
  return line
    .replace(/[^a-zA-Z0-9 .\-'/]/g, "") // Hanya karakter umum
    .replace(/\s+/g, " ") // Gabungkan spasi ganda
    .trim();
}

// Fungsi validasi sederhana
function sanitizeText(text) {
  return text.replace(/[^a-zA-Z0-9 .\-'/]/g, "").trim();
}

// Fungsi utama ekstraksi berdasarkan keyword dan tipe
const extractDataByKeyword = (text, keywords, type) => {
  const lines = text.split("\n").map(cleanLine);
  let extractedData = null;

  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();

    if (keywords.some(keyword => lowerLine.includes(keyword.toLowerCase()))) {
      const nextLine = lines[i + 1] ? cleanLine(lines[i + 1]) : "";

      if (type === "nama") {
        if (/^[A-Za-z .'-]{4,}$/.test(nextLine)) {
          extractedData = nextLine;
        }
      }
       else if (type === "keahlian") {
        let skill = lines[i]
          .replace(/has successfully achieved student level credentials for completing the|as a/gi, "")
          .trim();
        if (!skill && nextLine.length > 3) skill = nextLine;
        extractedData = skill;
      } else if (type === "nomor sertifikat") {
        extractedData = lines[i]
          .replace(/nomor\.?|no\.?|Instructor|Qo i|2025|number/i, "")
          .replace(":", "")
          .trim();
      }
      if (extractedData) break;
    }
  }

  return extractedData;
};

const sendTransaction = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const totalStartTime = performance.now();
    let imageBuffer;

    if (req.file.mimetype === "application/pdf") {
      const tempPdfPath = path.join(os.tmpdir(), `${Date.now()}.pdf`);
      const outputDir = path.dirname(tempPdfPath);
      const prefix = `page-${Date.now()}`;
      fs.writeFileSync(tempPdfPath, req.file.buffer);

      const options = {
        format: "png",
        out_dir: outputDir,
        out_prefix: prefix,
        page: 1,
        resolution: 300,
      };

      await poppler.convert(tempPdfPath, options);
      const imagePath = path.join(outputDir, `${prefix}-1.png`);

      if (!fs.existsSync(imagePath)) {
        return res.status(500).json({ error: "Gagal mengonversi PDF ke gambar" });
      }

      imageBuffer = fs.readFileSync(imagePath);
      fs.unlinkSync(tempPdfPath);
      fs.unlinkSync(imagePath);
    } else if (
      req.file.mimetype === "image/jpeg" ||
      req.file.mimetype === "image/png" ||
      req.file.mimetype === "image/jpg"
    ) {
      imageBuffer = req.file.buffer;
    } else {
      return res.status(400).json({ error: "Tipe file tidak didukung. Gunakan PDF atau Gambar." });
    }

    const cropStartTime = performance.now();
    // Proses crop dan OCR menggunakan Tesseract.js
    const metadata = await sharp(imageBuffer).metadata();
    if (metadata.width < 10 || metadata.height < 10) {
      return res.status(400).json({ error: "Ukuran gambar terlalu kecil untuk diproses OCR." });
    }

    // === OCR Bagian Atas (nama di atas) ===
    const topCropBuffer = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: 0,
        width: metadata.width,
        height: Math.floor(metadata.height * 0.4),
      })
      .toBuffer();

    const {
      data: { text: topText },
    } = await tesseract.recognize(topCropBuffer, "eng", {
      psm: 6,
      oem: 3,
    });

    // === OCR Bagian Bawah (nama di bawah) ===
    const bottomCropBuffer = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: Math.floor(metadata.height * 0.6), // bagian bawah 40%
        width: metadata.width,
        height: Math.floor(metadata.height * 0.4),
      })
      .toBuffer();

    const {
      data: { text: bottomText },
    } = await tesseract.recognize(bottomCropBuffer, "eng", {
      psm: 6,
      oem: 3,
    });

    // === OCR Full (untuk info umum) ===
    const {
      data: { text: fullText },
    } = await tesseract.recognize(imageBuffer, "eng", {
      psm: 6,
      oem: 3,
    });

    const text = `${topText}\n${bottomText}\n${fullText}`;
    console.log("Top Text extracted:", topText);
    console.log("Bottom Text extracted:", bottomText);
    console.log("Full Text extracted:", fullText);

    const cropEndTime = performance.now();
    console.log(`lama waktu cropping dan OCR: ${(cropEndTime - cropStartTime).toFixed(2)} ms`);

    const OCRStartTime = performance.now();
    let nama = extractDataByKeyword(topText, [
      "This certificate is awarded to",
      "presented to",
      "statement of achievement",
      "specialist",
      ". . CPC PCT",
      ". . A Pca"
    ], "nama")
    || extractDataByKeyword(bottomText, [
      "This certificate is awarded to",
      "presented to",
      "statement of achievement",
      "specialist",
      ". . CPC PCT",
      ". . A Pca"
    ], "nama")
    || extractDataByKeyword(fullText, [
      "This certificate is awarded to",
      "presented to",
      "statement of achievement",
      "specialist",
      ". . CPC PCT",
      ". . A Pca"
    ], "nama");

      if (!nama) {
      const topLines = topText.split("\n").map(line => line.trim());
      for (let i = 0; i < topLines.length; i++) {
        const line = topLines[i];
        // Cek apakah ini baris nama: huruf kapital + panjang minimal 2 kata
        if (/^[A-Z][a-z]+( [A-Z][a-z]+){1,3}$/.test(line)) {
          // Gabungkan dengan baris di bawahnya kalau juga mirip nama
          const nextLine = topLines[i + 1] || "";
          if (/^[A-Z][a-z]+( [A-Z][a-z]+){0,2}$/.test(nextLine)) {
            nama = `${line} ${nextLine}`.trim();
          } else {
            nama = line;
          }
          break;
        }
      }
    }

    const keahlian = extractDataByKeyword(fullText, [
      "software development",
      "database foundations",
      "javascript essentials",
      "linux essentials",
      " MikroTik Certified Network Associate"
    ], "keahlian");

    const nomorSertifikat = extractDataByKeyword(fullText, [
      
      "Qo i",
      "certificate number",
      "no",
      "certificate id",
      "id sertifikat",
      "oa/dfo",
      // "mikrotik",
      "Instructor" ,
      "2025",
      "certiport"
    ], "nomor sertifikat");

    const data = {
      nama: sanitizeText(nama || ""),
      keahlian: sanitizeText(keahlian || ""),
      nomorSertifikat: sanitizeText(nomorSertifikat || "")
    };

    console.log("Data yang diekstrak:", data);

    const OCREndTime = performance.now();
    console.log(`lama waktu OCR data: ${(OCREndTime - OCRStartTime).toFixed(2)} ms`);

    
    if (!data.nama || !data.keahlian || !data.nomorSertifikat) {
      return res.status(200).json({ message: "Template tidak sesuai dengan template yang dikenali" });
    }

    const transactionStartTime = performance.now();
    const result = await modelTransaction.sendTransaction(data);
    const transactionEndTime = performance.now();
    console.log(`lama waktu proses transaksi: ${(transactionEndTime - transactionStartTime).toFixed(2)} ms`);
    
    const totalEndTime = performance.now();
    console.log(`Total waktu proses: ${(totalEndTime - totalStartTime).toFixed(2)} ms`);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error saat memproses sertifikat:", error);
    return res.status(500).json({ error: "Terjadi kesalahan saat memproses sertifikat" });
  }
};

module.exports = { sendTransaction };