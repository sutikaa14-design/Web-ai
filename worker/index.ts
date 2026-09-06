const TIKTOK_SIGNATURE =
  "tiktok-developers-site-verification=076m5Ot4qJU5YXEOFQAKCEfv07PbTa95";

const TIKTOK_SIGNATURE_FILE =
  "tiktok076m5Ot4qJU5YXEOFQAKCEfv07PbTa95.txt";

const FALLBACKS: Record<string, string[]> = {
  ramah: [
    "Wah, makasih sudah mampir! 😊",
    "Halo! Senang banget kamu ikut ngobrol.",
    "Makasih sudah hadir, jangan malu-malu ikut komentar ya!",
  ],
  lucu: [
    "Waduh, komentarnya bikin suasana makin rame nih 😂",
    "Nah ini baru komentar yang bikin host semangat!",
    "Aduh, bisa aja nih 😂",
  ],
  santai: [
    "Hehe, santai aja, kita ngobrol bareng di sini.",
    "Mantap, makasih sudah ikut nongkrong.",
    "Seru nih kalau ngobrolnya begini.",
  ],
  profesional: [
    "Terima kasih sudah bergabung di LIVE kami.",
    "Terima kasih atas komentarnya.",
    "Senang melihat Anda ikut berinteraksi.",
  ],
  energik: [
    "WOOO! Makasih sudah mampir! 🔥",
    "Nahhh ini dia! LIVE makin rame! 🔥",
    "Mantap banget! Jangan berhenti komen ya!",
  ],
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function fallbackReply(persona = "ramah") {
  const pool = FALLBACKS[persona] || FALLBACKS.ramah;
  return pool[Math.floor(Math.random() * pool.length)];
}

function cleanText(value: unknown, max = 2000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

async function generateGemini(
  env: any,
  promptText: string,
  systemInstruction: string
) {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi");
  }

  const models = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
  ];

  let lastError = "Gemini request failed";

  for (const model of models) {
    try {
      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
        `?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemInstruction,
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: promptText,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
            maxOutputTokens: 180,
          },
        }),
      });

      const data: any = await response.json();

      if (!response.ok) {
        lastError =
          data?.error?.message ||
          `Gemini HTTP ${response.status}`;
        continue;
      }

      const result =
        data?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part?.text || "")
          .join("")
          .trim();

      if (result) {
        return result;
      }

      lastError = "Gemini tidak mengembalikan teks";
    } catch (error: any) {
      lastError = error?.message || String(error);
    }
  }

  throw new Error(lastError);
}

function personaDescription(persona: string) {
  const descriptions: Record<string, string> = {
    ramah:
      "Hangat, ramah, dekat dengan penonton, dan suka menyapa.",
    lucu:
      "Humoris, spontan, ringan, tetapi tidak berlebihan.",
    santai:
      "Santai seperti teman ngobrol, natural dan tidak kaku.",
    profesional:
      "Sopan, jelas, percaya diri, tetapi tetap terasa manusiawi.",
    energik:
      "Bersemangat, positif, dan mampu membuat LIVE terasa ramai.",
  };

  return descriptions[persona] || descriptions.ramah;
}

function variationInstruction(variation: string) {
  const instructions: Record<string, string> = {
    regenerate:
      "Buat jawaban alternatif yang berbeda dari jawaban sebelumnya.",
    shorter:
      "Buat jawaban jauh lebih singkat dan langsung.",
    funny:
      "Buat lebih lucu dan menghibur secara natural.",
    friendly:
      "Buat lebih hangat dan bersahabat.",
    hype:
      "Buat lebih bersemangat untuk menaikkan suasana LIVE.",
    continue:
      "Lanjutkan percakapan secara natural berdasarkan konteks.",
    invite:
      "Ajak penonton lain ikut berkomentar atau bergabung.",
    pantun:
      "Jawab menggunakan pantun pendek yang relevan dan natural.",
    riddle:
      "Buat jawaban dengan teka-teki ringan yang cocok untuk LIVE.",
  };

  return instructions[variation] || "";
}

async function handleChatRespond(request: Request, env: any) {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        success: false,
        error: "Request JSON tidak valid",
      },
      400
    );
  }

  const hostName = cleanText(body?.hostName, 100);
  const coHostName = cleanText(body?.coHostName, 100);
  const persona = cleanText(body?.persona, 50) || "ramah";
  const topic = cleanText(body?.topic, 500);
  const currentComment = cleanText(body?.currentComment, 1000);
  const viewerName = cleanText(body?.viewerName, 100);
  const variation = cleanText(body?.variation, 50);
  const useFallback = Boolean(body?.useFallback);
  const simulateError = Boolean(body?.simulateError);

  const history = Array.isArray(body?.history)
    ? body.history.slice(-8)
    : [];

  if (simulateError) {
    return json({
      success: true,
      reply: fallbackReply(persona),
      source: "fallback",
    });
  }

  const systemInstruction = `
Kamu adalah AI co-host untuk TikTok LIVE bernama LiveMate AI.

Gaya bicara:
- ${personaDescription(persona)}
- Gunakan Bahasa Indonesia yang natural.
- Jangan terdengar seperti robot.
- Jangan menggunakan bahasa terlalu formal kecuali persona profesional.
- Jawaban biasanya 1 sampai 3 kalimat pendek.
- Cocok untuk dibacakan atau ditampilkan saat LIVE.
- Jangan mengarang fakta pribadi tentang penonton.
- Jangan meminta data sensitif.
- Jangan mengatakan bahwa kamu adalah sistem AI kecuali memang diperlukan.
- Ikuti konteks percakapan sebelumnya.
- Jangan mengulang jawaban yang sama terus-menerus.
- Jangan membuat jawaban terlalu panjang.
`;

  const historyText = history
    .map((item: any) => {
      const role = cleanText(item?.role, 30);
      const content = cleanText(item?.content, 500);

      if (!content) return "";

      return `${role || "chat"}: ${content}`;
    })
    .filter(Boolean)
    .join("\n");

  const promptText = `
Nama host: ${hostName || "Host"}
Nama co-host: ${coHostName || "LiveMate"}
Topik LIVE: ${topic || "Tidak ditentukan"}
Nama penonton: ${viewerName || "Penonton"}
Komentar terbaru:
${currentComment || "(tidak ada komentar)"}

Riwayat percakapan:
${historyText || "(belum ada riwayat)"}

${variationInstruction(variation)}

Buat respons yang paling natural untuk kondisi LIVE tersebut.
`;

  if (useFallback) {
    return json({
      success: true,
      reply: fallbackReply(persona),
      source: "fallback",
    });
  }

  try {
    const reply = await generateGemini(
      env,
      promptText,
      systemInstruction
    );

    return json({
      success: true,
      reply,
      source: "gemini",
    });
  } catch (error: any) {
    return json({
      success: true,
      reply: fallbackReply(persona),
      source: "fallback",
      error: error?.message || "Gemini error",
    });
  }
}

function privacyPage() {
  return html(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Privacy Policy - LiveMate AI</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 850px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <h1>Privacy Policy - LiveMate AI</h1>

  <p>
    LiveMate AI adalah aplikasi pendukung TikTok LIVE yang membantu
    kreator menghasilkan respons percakapan menggunakan teknologi AI.
  </p>

  <h2>Informasi yang Diproses</h2>
  <p>
    Aplikasi dapat memproses informasi yang diperlukan untuk menjalankan
    fitur aplikasi, termasuk input percakapan yang diberikan pengguna.
  </p>

  <h2>Penggunaan Informasi</h2>
  <p>
    Informasi digunakan untuk menyediakan fungsi AI co-host,
    meningkatkan pengalaman penggunaan, dan menjalankan fitur aplikasi.
  </p>

  <h2>Keamanan</h2>
  <p>
    Kami berupaya menjaga informasi pengguna dan tidak meminta data
    sensitif yang tidak diperlukan untuk fungsi aplikasi.
  </p>

  <h2>Kontak</h2>
  <p>
    Untuk pertanyaan mengenai privasi, pengguna dapat menghubungi
    pengelola LiveMate AI melalui kanal kontak yang tersedia.
  </p>

  <p>
    <a href="/">Kembali ke LiveMate AI</a>
  </p>
</body>
</html>
`);
}

function termsPage() {
  return html(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Terms of Service - LiveMate AI</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 850px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <h1>Terms of Service - LiveMate AI</h1>

  <p>
    Dengan menggunakan LiveMate AI, pengguna menyetujui ketentuan
    penggunaan layanan ini.
  </p>

  <h2>Penggunaan Layanan</h2>
  <p>
    LiveMate AI disediakan sebagai alat bantu AI untuk mendukung
    aktivitas LIVE pengguna.
  </p>

  <h2>Tanggung Jawab Pengguna</h2>
  <p>
    Pengguna bertanggung jawab atas konten dan tindakan yang dilakukan
    menggunakan aplikasi.
  </p>

  <h2>Ketersediaan</h2>
  <p>
    Fitur dapat mengalami perubahan, gangguan, atau penghentian
    sementara untuk pemeliharaan.
  </p>

  <p>
    <a href="/">Kembali ke LiveMate AI</a>
  </p>
</body>
</html>
`);
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    /*
     * =========================================================
     * TIKTOK URL PREFIX VERIFICATION
     * =========================================================
     *
     * TikTok meminta signature file dengan nama persis:
     *
     * tiktok076m5Ot4qJU5YXEOFQAKCEfv07PbTa95.txt
     *
     * URL:
     * /terms/tiktok076m5Ot4qJU5YXEOFQAKCEfv07PbTa95.txt
     */

    if (
      request.method === "GET" &&
      url.pathname === `/terms/${TIKTOK_SIGNATURE_FILE}`
    ) {
      return text(TIKTOK_SIGNATURE);
    }

    /*
     * Terms of Service
     */
    if (
      request.method === "GET" &&
      (url.pathname === "/terms" ||
        url.pathname === "/terms/")
    ) {
      return termsPage();
    }

    /*
     * Privacy Policy
     */
    if (
      request.method === "GET" &&
      (url.pathname === "/privacy" ||
        url.pathname === "/privacy/")
    ) {
      return privacyPage();
    }

    /*
     * Health check
     */
    if (
      request.method === "GET" &&
      url.pathname === "/api/health"
    ) {
      return json({
        success: true,
        service: "LiveMate AI",
        status: "ok",
        geminiConfigured: Boolean(env.GEMINI_API_KEY),
        timestamp: new Date().toISOString(),
      });
    }

    /*
     * Simple API test
     */
    if (
      request.method === "GET" &&
      url.pathname === "/api/test"
    ) {
      return json({
        success: true,
        message: "LiveMate AI Worker is running",
      });
    }

    /*
     * AI Chat
     */
    if (
      request.method === "POST" &&
      url.pathname === "/api/chat/respond"
    ) {
      return handleChatRespond(request, env);
    }

    /*
     * Frontend
     */
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("LiveMate AI Worker", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  },
};
