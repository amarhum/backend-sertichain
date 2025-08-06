const tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const poppler = require("pdf-poppler");
const sharp = require("sharp");
const Jimp = require("jimp");
const QrCode = require("qrcode-reader");
const { performance } = require('perf_hooks');
const modelTransaction = require("../models/transaction");

function cleanLine(line) {
  return line
    .replace(/[^a-zA-Z0-9 .,\-'/]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


async function decodeQR(imageBuffer) {
  try {
    imageBuffer = await sharp(imageBuffer)
    .resize({ width: 1200 })
    .threshold(150)
    .toBuffer();
    
    
    const image = await Jimp.read(imageBuffer);

    return await new Promise((resolve, reject) => {
      const qr = new QrCode();
      qr.callback = (err, value) => {
        if (err || !value) {
          console.warn("QR decoding gagal:", err);
          return resolve(null);
        }
        resolve(value.result || null);
      };
      qr.decode(image.bitmap);
    });
  } catch (error) {
    console.error("Gagal membaca buffer QR:", error);
    return null;
  }
}

function sanitizeText(text) {
  return text
    .replace(/[^a-zA-Z0-9 .,\-'/]/g, "")
    .replace(/\boe\b|\bNn\b|\boe Nn\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const extractDataByKeyword = (text, keywords, type) => {
  const lines = text.split("\n").map(cleanLine);
  let extractedData = null;

  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();

    if (keywords.some(keyword => lowerLine.includes(keyword.toLowerCase()))) {
      const nextLine = lines[i + 1] ? cleanLine(lines[i + 1]) : "";

if (type === "nama") {
  let candidate = nextLine || lines[i + 1] || "";

  candidate = candidate
    .replace(/Cera|Mr|Awarded|Date|Presented|Name|BY|BY:/gi, "")
    .replace(/[^a-zA-Z .'-]/g, "") // hapus karakter asing
    .replace(/\s+/g, " ") // rapikan spasi
    .trim();

  if (candidate.split(" ").length >= 2 && candidate.length > 8) {
    extractedData = candidate;
  }
}


          else if (type === "keahlian") {
        let skill = lines[i]
          .replace(/has successfully achieved student level credentials for completing the|has successfully achieved student level credential for completing the| oe|ee Nhe,| oe Nn|as a/gi, "")
          .trim();
        if (!skill && nextLine.length > 3) skill = nextLine;
        skill = skill.replace(/\boe\b|\bNn\b|\boe Nn\b/gi, "").trim();
        extractedData = skill;
      } else if (type === "nomor sertifikat") {
        const match = lines[i].match(/OA\/[A-Z]+\/[A-Z]+\/[A-Z0-9]+\/\d{4}\/\d{2}/);
        if (match) {
          extractedData = match[0];
        } else {
          extractedData = lines[i]
            .replace(/nomor\.?|no\.?|Instructor|Issued on|. z April 18, 2025|On wert|CR ee|. - April 18, 2025 | PR Pe|. oY A|Qo i|number/gi, "")
            .replace(":", "")
            .trim();
      }
          extractedData = extractedData.replace(/\boe\b|\bNn\b|\boe Nn\b/gi, "").trim();
      }
      if (extractedData) break;
    }
  }
  return extractedData;
};

const sendTransaction = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

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
          resolution: 800,
          antialias: true,                
          grayscale: false,             
          useCropBox: false,          
          disableFontSubstitution: true,
          disableImageSubstitution: true,
        };

      const pdfStartTime = performance.now();
      await poppler.convert(tempPdfPath, options);
      const pdfEndTime = performance.now();
      console.log(`lama waktu konversi PDF ke gambar: ${(pdfEndTime - pdfStartTime).toFixed(2)} ms`);

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
      imageBuffer = await sharp(req.file.buffer)
        .resize({ width: 1200 })
        .grayscale()
        .threshold(220)
        .toBuffer();
    } else {
      return res.status(400).json({ error: "Tipe file tidak didukung. Gunakan PDF atau Gambar." });
    }

    // Periksa ukuran gambar
    const metadata = await sharp(imageBuffer).metadata();
    if (metadata.width < 10 || metadata.height < 10) {
      return res.status(400).json({ error: "Ukuran gambar terlalu kecil untuk diproses OCR." });
    }

    const cropStartTime = performance.now();
    // Crop bagian atas
    const topCropBuffer = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: 0,
        width: metadata.width,
        height: Math.floor(metadata.height * 0.4),
      })
      .toBuffer();

    const { data: { text: topText } } = await tesseract.recognize(topCropBuffer, "eng", {
      psm: 6,
      oem: 3,
    });

    // Crop bagian bawah
    const bottomCropBuffer = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: Math.floor(metadata.height * 0.6),
        width: metadata.width,
        height: Math.floor(metadata.height * 0.4),
      })
      .toBuffer();

    const { data: { text: bottomText } } = await tesseract.recognize(bottomCropBuffer, "eng", {
      psm: 6,
      oem: 3,
    });

        let qrDecodedText = "";
        let nomorSertifikatFromQR = "";

        try {
          qrDecodedText = await decodeQR(imageBuffer);
          console.log("QR Decoded Text from full image:", qrDecodedText);

          if (qrDecodedText && qrDecodedText.includes("number=")) {
            const match = qrDecodedText.match(/number=([^&\s]+)/);
            if (match) {
              nomorSertifikatFromQR = match[1];
              console.log("Nomor Sertifikat dari QR:", nomorSertifikatFromQR);
            }
          }
        } catch (e) {
          console.warn("QR decoding gagal:", e.message);
        }

     
      if (!qrDecodedText) {
        qrDecodedText = await decodeQR(imageBuffer);
        console.log("QR Decoded Text from full image:", qrDecodedText);
      }

    // OCR full image
    const { data: { text: fullText } } = await tesseract.recognize(imageBuffer, "eng", {
      psm: 6,
      oem: 3,
    });
    
    console.log("Top Text extracted:", topText);
    console.log("Bottom Text extracted:", bottomText);
    console.log("Full Text extracted:", fullText);
    console.log("QR Text extracted:", qrDecodedText);
    const cropEndTime = performance.now();
    console.log(`lama waktu cropping: ${(cropEndTime - cropStartTime).toFixed(2)} ms`);
    
    const OCRStartTime = performance.now();
    // Ekstraksi data nama
    let nama =
      extractDataByKeyword(topText, [
        "This certificate is awarded to",
        "presented to",
        "statement of achievement",
        ". . * PCT Sc",
        ". . CPC PCT",
        ". . A Pca",
        ". . * PCT Sc"
      ], "nama") ||
      extractDataByKeyword(bottomText, [
        "This certificate is awarded to",
        "presented to",
        "statement of achievement",
        ". . * PCT Sc",
        ". . CPC PCT",
        ". . A Pca",
        ". . * PCT Sc"
      ], "nama") ||
      extractDataByKeyword(fullText, [
        "This certificate is awarded to",
        "presented to",
        "statement of achievement",
        ". . * PCT Sc",
        ". . CPC PCT",
        ". . A Pca",
        
      ], "nama");


      if (!nama) {
      const candidates = [topText, bottomText, fullText];

      for (const section of candidates) {
        const lines = section.split("\n").map(line => line.trim());
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/^[A-Z][a-z]+( [A-Z][a-z]+){1,3}$/.test(line)) {
            const nextLine = lines[i + 1] || "";
            if (/^[A-Z][a-z]+( [A-Z][a-z]+){0,2}$/.test(nextLine)) {
              nama = `${line} ${nextLine}`.trim();
            } else {
              nama = line;
            }
            break;
          }
        }
        if (nama) break;
      }
    }


    // Ekstraksi keahlian
    const keahlian = extractDataByKeyword(fullText, [
      "software development",
      "database foundations",
      "javascript essentials",
      "linux essentials",
      " MikroTik Certified Network Associate",
    ], "keahlian");


    let nomorSertifikat = nomorSertifikatFromQR;

    if (!nomorSertifikat && qrDecodedText && qrDecodedText.includes("number=")) {
      const match = qrDecodedText.match(/number=([^&\s]+)/);
      if (match) nomorSertifikat = match[1];
    }

if (!nomorSertifikat) {
  nomorSertifikat =
    extractDataByKeyword(topText, [
      "certificate number",
      "Instructor",
      "Qo i ",
      "OA/", "BATCH", "Issued on", "number",
      ". z","g 2 £",". -",
      "On powers"
    ], "nomor sertifikat") ||
    extractDataByKeyword(bottomText, [
      "certificate number",
      "Instructor",
      "Qo i ",
      "OA/", "BATCH", "Issued on", "number",
      ". z","g 2 £",". -",
      "On powers"
    ], "nomor sertifikat") ||
    extractDataByKeyword(fullText, [
      "certificate number",
      "Instructor",
      "Qo i ",
      "OA/", "BATCH", "Issued on", "number",
      ". z","g 2 £",". -",
      "On powers"
    ], "nomor sertifikat");
}


        if (!nomorSertifikat) {
      const topLines = topText.split("\n").map(line => line.trim());
      for (let i = 0; i < topLines.length; i++) {
        const line = topLines[i];
        if (/^[A-Z][a-z]+( [A-Z][a-z]+){1,3}$/.test(line)) {
          const nextLine = topLines[i + 1] || "";
          if (/^[A-Z][a-z]+( [A-Z][a-z]+){0,2}$/.test(nextLine)) {
            nomorSertifikat  = `${line} ${nextLine}`.trim();
          } else {
            nomorSertifikat  = line;
          }
          break;
        }
      }
    }
    // Sanitasi hasil ekstraksi
    const data = {
      nama: sanitizeText((nama || "").replace(/\b(Cera|CR ee)\b/gi, "")),
      keahlian: sanitizeText(keahlian || ""),
      nomorSertifikat: sanitizeText(nomorSertifikat || ""),
    };
    const OCREndTime = performance.now();
    console.log(`lama waktu OCR data: ${(OCREndTime - OCRStartTime).toFixed(2)} ms`);
    console.log("Data yang diekstrak:", data);


    if (!data.nama.trim() || !data.keahlian.trim() || !data.nomorSertifikat.trim()) {
      console.log("Data sertifikat tidak dikenali:", data);
      return res.status(200).json({ message: "Data sertifikat tidak dapat dikenali." });
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