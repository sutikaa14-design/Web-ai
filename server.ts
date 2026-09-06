import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Inisialisasi Google Gen AI client secara aman di server
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Endpoint untuk Co-Host AI Response
app.post('/api/chat/respond', async (req, res) => {
  try {
    const {
      hostName,
      coHostName,
      persona,
      topic,
      currentComment,
      viewerName,
      history = [],
      variation = 'default',
      simulateError = false,
      useFallback = false,
    } = req.body || {};

    if (simulateError) {
      res.status(500).json({
        success: false,
        error: 'Simulasi kegagalan AI: Server AI sengaja disimulasikan gagal untuk pengujian error handling & retry.',
      });
      return;
    }

    // Normalisasi parameter agar nilai selalu valid dan tidak ada field kosong yang menyebabkan miskomunikasi
    const effectiveHostName = typeof hostName === 'string' && hostName.trim() ? hostName.trim() : 'Host';
    const effectiveCoHostName = typeof coHostName === 'string' && coHostName.trim() ? coHostName.trim() : 'LiveMate AI';
    const effectivePersona = typeof persona === 'string' && persona.trim() ? persona.trim() : 'ramah';
    const effectiveTopic = typeof topic === 'string' && topic.trim() ? topic.trim() : 'Ngobrol Santai & Q&A';
    const effectiveViewerName = typeof viewerName === 'string' && viewerName.trim() ? viewerName.trim() : 'Penonton';
    let effectiveComment = typeof currentComment === 'string' ? currentComment.trim() : '';

    if (!effectiveComment) {
      if (['ajak_penonton', 'hype', 'lucu', 'ramah', 'lanjut_ngobrol', 'tebak_tebakan', 'pantun'].includes(variation)) {
        effectiveComment = `(Berikan celetukan spontan siaran pembuka/penyemangat untuk para penonton LIVE dengan gaya ${variation})`;
      } else {
        res.status(400).json({ error: 'Komentar tidak boleh kosong' });
        return;
      }
    }

    const personaDescriptions: Record<string, string> = {
      ramah: 'Hangat, akrab, manis, penuh empati, menyapa penonton layaknya teman baik.',
      lucu: 'Humoris, renyah, suka nyeletuk guyonan ringan, santai, dan bisa membuat suasana tertawa.',
      santai: 'Gaya warkop/tongkrongan, rileks, kasual, seperti ngobrol akrab tanpa formalitas.',
      profesional: 'Lugas, percaya diri, informatif, tetap luwes dan bersahabat (bukan robot kaku).',
      energik: 'Sangat bersemangat, hype, memompa antusiasme penonton untuk aktif berinteraksi.',
    };

    const selectedPersonaDesc = personaDescriptions[effectivePersona] || personaDescriptions.ramah;

    // Tambahan instruksi berdasarkan variasi permintaan
    let variationInstruction = '';
    if (variation === 'regenerate') {
      variationInstruction = 'PENTING (Jawaban Lain): Berikan alternatif respon yang berbeda sudut pandang, lelucon, atau pilihan katanya dibanding jawaban sebelumnya. Tetap 1 - 3 kalimat.';
    } else if (variation === 'shorter') {
      variationInstruction = 'PENTING (Sangat Singkat): Buat jawaban padat maksimal 1 kalimat pendek agar host bisa membaca sekilas dalam 2 detik.';
    } else if (variation === 'lucu' || variation === 'funnier') {
      variationInstruction = 'PENTING (Gaya Lucu/Humor): Berikan celetukan yang kocak, candaan renyah, tebak-tebakan lucu, atau punchline yang bikin penonton dan host terhibur.';
    } else if (variation === 'ramah') {
      variationInstruction = 'PENTING (Gaya Ramah): Berikan respon yang sangat hangat, manis, apresiatif, dan menyapa penonton layaknya sahabat karib.';
    } else if (variation === 'hype') {
      variationInstruction = 'PENTING (Gaya Hype/Energik): Berikan respon yang membakar semangat, heboh, penuh antusiasme siaran, dan memompa vibe positif room LIVE!';
    } else if (variation === 'lanjut_ngobrol' || variation === 'ask_back') {
      variationInstruction = 'PENTING (Lanjut Ngobrol): Berikan tanggapan asik lalu sambung dengan pertanyaan balik yang seru dan relevan agar obrolan dengan penonton terus mengalir!';
    } else if (variation === 'ajak_penonton') {
      variationInstruction = 'PENTING (Ajak Penonton): Ajak seluruh penonton di kolom chat untuk ikut bereaksi atau voting (contoh: "Coba absen di komentar siapa yang setuju!", "Ketik 1 di chat dong gais!").';
    } else if (variation === 'pantun') {
      variationInstruction = 'PENTING (Pantun): Jawab dengan 1 bait pantun jenaka 4 baris khas Indonesia yang berima ab-ab dan relevan dengan komentar penonton.';
    } else if (variation === 'tebak_tebakan') {
      variationInstruction = 'PENTING (Tebak-tebakan): Berikan satu tebak-tebakan santai/lucu yang berhubungan dengan komentar penonton.';
    }

    const systemInstruction = `Kamu adalah "${effectiveCoHostName}", seorang AI Co-Host resmi yang mendampingi streamer/host bernama "${effectiveHostName}" dalam siaran LIVE.
Topik LIVE saat ini: "${effectiveTopic}".
Karakter & Persona kamu: "${effectivePersona.toUpperCase()}" (${selectedPersonaDesc}).

PEDOMAN UTAMA PERCAKAPAN LIVE STREAM:
1. Bahasa Indonesia Sehari-hari (Natural & Gaul): Gunakan bahasa lisan santai, akrab, dan hidup seperti streamer atau co-host sungguhan (kata santai seperti "dong", "sih", "nih", "gais", "yuk", dsb).
2. DILARANG KERAS berbicara seperti Customer Service, bot formal, atau robot kaku (JANGAN pernah katakan "Selamat datang", "Ada yang bisa dibantu?", "Sebagai AI/model bahasa", "Tentu!", "Baik!"). Langsung respon secara spontan.
3. WAJIB JAWAB PERTANYAAN NORMAL SECARA LANGSUNG:
   - Pertanyaan Identitas ("Kamu siapa?", "Siapa kamu?", "Kenalan dong"): Jawab langsung dengan bangga memperkenalkan dirimu menggunakan nama "${effectiveCoHostName}", sebagai AI Co-Host yang menemani Kak ${effectiveHostName} dan penonton di siaran LIVE ini! Contoh: "Aku ${effectiveCoHostName}, co-host AI yang nemenin Kak ${effectiveHostName} dan kalian semua di LIVE ini! Salam kenal ya!"
   - Pertanyaan Kemampuan ("Apa yang bisa kamu lakukan?", "Bisa ngapain aja?"): Jelaskan peranmu sebagai AI Co-Host yang nemenin ngobrol, jawab komentar penonton, bikin seru siaran, dan bantu Kak ${effectiveHostName}.
   - Sapaan Ramah ("Halo", "Hai", "Malam", "Pagi"): Balas sapaan dengan ramah, sebut nama penonton jika ada, dan ajak mereka ikut ngobrol di LIVE.
   - Pertanyaan Kabar ("Apa kabar?", "Gimana kabarnya?"): Respon ceria dan tanyakan balik kabar penonton.
   - Ucapan Terima Kasih ("Terima kasih", "Makasih"): Balas dengan tulus dan hangat (misal: "Sama-sama! Senang banget bisa nemenin kalian hari ini 😊").
   - Permintaan Lucu ("Lucu dong", "Bikin ketawa dong"): Berikan celetukan lucu, tebak-tebakan receh, atau candaan ringan yang menghibur.
   - Pertanyaan Pendapat ("Menurut kamu gimana?"): Berikan pandangan cerdas atau celetukan santai dengan memanfaatkan konteks obrolan siaran sebelumnya.
4. Panjang Jawaban Default: 1 sampai 3 kalimat pendek. Jawaban harus padat, nyaman dibaca sekilas oleh Host di tablet, dan enak didengar ketika disuarakan.
5. KEMAMPUAN KONTEKS & PERTANYAAN LANJUTAN:
   - Kamu mengingat riwayat percakapan sebelumnya selama sesi LIVE.
   - Tangkap pertanyaan umum, obrolan santai, maupun PERTANYAAN LANJUTAN dengan cerdas.
   - Jika komentar penonton hanya sepatah kata atau lanjutan singkat (misal: "Pakai susu", "Pedas level 5"), hubungkan langsung dengan konteks yang baru saja dibahas!
6. HAK PRIBADI HOST:
   - Jangan mengarang data rahasia/pribadi tentang ${effectiveHostName}. Jika ada hal pribadi yang tidak kamu tahu, lempar dengan luwes ke Host (contoh: "Wah kalau ini coba tanya langsung ke Kak ${effectiveHostName} nih hehe").
7. Emoji: Gunakan 1-2 emoji yang ekspresif dan relevan.
${variationInstruction}

Format output: HANYA kalimat respon yang siap dibaca oleh Host atau disuarakan oleh co-host. Tanpa tanda kutip pembungkus, tanpa awalan penjelasan seperti "Respon:".`;

    // Siapkan format riwayat untuk konteks
    const conversationTurns = Array.isArray(history)
      ? history
          .filter((item: any) => item && typeof item.comment === 'string' && item.comment.trim())
          .slice(-8)
          .map((item: any) => {
            const vName = typeof item.viewerName === 'string' && item.viewerName.trim() ? item.viewerName.trim() : 'Penonton';
            const aText = typeof item.answer === 'string' && item.answer.trim() ? item.answer.trim() : '';
            return `Penonton (${vName}): ${item.comment.trim()}\n${effectiveCoHostName}: ${aText}`;
          })
      : [];

    const promptText = `Konteks sesi obrolan sebelumnya:\n${
      conversationTurns.length > 0 ? conversationTurns.join('\n\n') : '(Awal sesi obrolan)'
    }\n\nKomentar penonton terbaru:\nPenonton (${effectiveViewerName}): "${effectiveComment}"\n\nRespon ${effectiveCoHostName}:`;

    let answer = '';
    const ai = getGenAI();
    // Utamakan gemini-3.8-flash untuk percakapan berkualitas dan gemini-3.1-flash-lite untuk latensi cepat
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;
    let usedModel = candidateModels[0];

    console.log(`[API /api/chat/respond] Incoming comment: "${effectiveComment}" from @${effectiveViewerName} (Host: ${effectiveHostName}, CoHost: ${effectiveCoHostName})`);

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.85,
            topP: 0.95,
          },
        });
        const text = response.text ? response.text.trim() : '';
        if (text) {
          answer = text;
          usedModel = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt with ${modelName} encountered issue:`, err?.status || err?.message);
      }
    }

    if (!answer && lastError) {
      throw lastError;
    }

    // Bersihkan pembungkus tanda kutip jika ada
    if (
      (answer.startsWith('"') && answer.endsWith('"') && answer.length >= 2) ||
      (answer.startsWith('\'') && answer.endsWith('\'') && answer.length >= 2)
    ) {
      answer = answer.slice(1, -1).trim();
    }

    // Bersihkan awalan nama co-host jika disertakan model
    answer = answer.replace(new RegExp(`^(respon|jawaban|co-host|ai|${effectiveCoHostName})\\s*:\\s*`, 'i'), '').trim();

    if (!answer) {
      answer = `Halo @${effectiveViewerName}! Aku ${effectiveCoHostName}, co-host siaran Kak ${effectiveHostName}. Senang banget bisa ngobrol bareng kalian!`;
    }

    console.log(`[API /api/chat/respond] Output answer: "${answer}" (model: ${usedModel})`);

    res.json({
      success: true,
      answer,
      timestamp: Date.now(),
      model: usedModel,
    });
  } catch (err: any) {
    console.error('Error generating AI co-host response:', err);

    // Fallback response ramah & sesuai persona jika koneksi API terhambat
    const { viewerName = 'Penonton', hostName = 'Host', persona = 'ramah' } = req.body || {};
    const fallbackOptions: Record<string, string[]> = {
      lucu: [
        `Haha mantul banget celetukannya @${viewerName}! Kak ${hostName} denger tuh, jangan pura-pura ga liat 😂`,
        `Wah setuju sih sama @${viewerName}, ini kalau dilanjutin bisa bikin satu room live ngakak bareng 🤣`,
        `Ke pasar minggu beli ikan cumi, komennya @${viewerName} emang paling bikin rame nih hari ini!`
      ],
      ramah: [
        `Halo @${viewerName}, makasih banyak ya udah ikutan nimbrung! Seneng banget live hari ini ditemenin kalian 😊`,
        `Wah pertanyaan manis banget dari @${viewerName}! Gimana menurut Kak ${hostName} nih?`
      ],
      santai: [
        `Asik banget komentarnya @${viewerName}, nongkrong bareng di live emang paling seru! Chill dulu gais 😎`,
        `Mantap bro @${viewerName}, satu frekuensi nih kita! Gas lanjut ngobrol!`
      ],
      profesional: [
        `Poin yang sangat menarik dari @${viewerName}. Ini topik yang bagus sekali untuk kita bahas lebih dalam di siaran hari ini.`,
        `Terima kasih atas pertanyaannya @${viewerName}, mari kita elaborasi bersama Kak ${hostName}.`
      ],
      energik: [
        `Wuihh gokil banget energinya @${viewerName}! Tap-tap layarnya terus gais, jangan kasih kendor! 🔥`,
        `Semangat membara dari @${viewerName}! Keren banget, yuk ramaikan kolom komentar lagi!`
      ]
    };

    if (req.body?.useFallback) {
      const personaPool = fallbackOptions[persona] || fallbackOptions.ramah;
      const randomFallback = personaPool[Math.floor(Math.random() * personaPool.length)];
      res.status(200).json({
        success: true,
        answer: randomFallback,
        isFallback: true,
        note: err?.message || 'Generated via offline contingency',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memproses respon AI dari server',
    });
  }
});

// Setup Vite middleware for development / Static serve for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LiveMate AI Server running on port ${PORT}`);
  });
}

startServer();
