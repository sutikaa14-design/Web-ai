interface Env {
  ASSETS: Fetcher;
  GEMINI_API_KEY?: string;
}

const fallbackPools: Record<string, string[]> = {
  ramah: [
    "Wah, makasih ya sudah mampir! 😊",
    "Halo! Senang banget kamu ikut ngobrol di sini.",
    "Hehe, boleh banget, kita ngobrol santai ya!"
  ],
  lucu: [
    "Waduh, pertanyaannya bikin otak saya olahraga dulu 😂",
    "Hehe, bisa aja nih yang nanya!",
    "Nah ini baru pertanyaan yang bikin suasana makin seru 😂"
  ],
  santai: [
    "Hehe, santai aja, kita ngobrol pelan-pelan.",
    "Iya nih, seru juga kalau dibahas bareng.",
    "Boleh, kita lanjut ngobrol ya."
  ],
  profesional: [
    "Baik, kita bahas secara singkat dan jelas ya.",
    "Terima kasih pertanyaannya. Kita lihat bersama.",
    "Baik, saya bantu jawab sesuai konteksnya."
  ],
  energik: [
    "Wihhh, mantap! 🔥 Ada yang punya pertanyaan lain?",
    "Nahhh, ini baru seru! 🔥",
    "Gas terus! Jangan malu-malu, ikut ngobrol!"
  ]
};

function fallbackAnswer(persona = "ramah") {
  const pool = fallbackPools[persona] || fallbackPools.ramah;
  return pool[Math.floor(Math.random() * pool.length)];
}

function cleanAnswer(text: string) {
  return text
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateGemini(
  apiKey: string,
  prompt: string
): Promise<string | null> {

  const models = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite"
  ];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.85,
              topP: 0.95,
              maxOutputTokens: 180
            }
          })
        }
      );

      if (!response.ok) {
        continue;
      }

      const data: any = await response.json();

      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part?.text || "")
          .join("")
          .trim();

      if (text) {
        return cleanAnswer(text);
      }
    } catch {
      // Coba model berikutnya
    }
  }

  return null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        status: "ok",
        time: new Date().toISOString(),
        platform: "cloudflare-workers"
      });
    }

    // Worker test
    if (url.pathname === "/api/test" && request.method === "GET") {
      return json({
        success: true,
        message: "LiveMate AI Worker aktif!"
      });
    }

    // AI chat
    if (
      url.pathname === "/api/chat/respond" &&
      request.method === "POST"
    ) {
      try {
        const body: any = await request.json();

        const hostName =
          String(body.hostName || "Host");

        const coHostName =
          String(body.coHostName || "AI");

        const persona =
          String(body.persona || "ramah");

        const topic =
          String(body.topic || "");

        const currentComment =
          String(body.currentComment || "");

        const viewerName =
          String(body.viewerName || "Viewer");

        const variation =
          String(body.variation || "");

        const history =
          Array.isArray(body.history)
            ? body.history.slice(-8)
            : [];

        const useFallback =
          Boolean(body.useFallback);

        const historyText = history
          .map((item: any) => {
            const role =
              item?.role === "assistant"
                ? coHostName
                : viewerName;

            const text =
              String(item?.content || item?.text || "");

            return `${role}: ${text}`;
          })
          .join("\n");

        const personaDescription: Record<string, string> = {
          ramah:
            "ramah, hangat, perhatian, dan terasa dekat dengan penonton",
          lucu:
            "lucu, spontan, ringan, dan sesekali menggunakan humor",
          santai:
            "santai, natural, seperti ngobrol dengan teman",
          profesional:
            "profesional tetapi tetap hangat dan tidak kaku",
          energik:
            "ceria, bersemangat, aktif mengajak penonton berinteraksi"
        };

        const variationInstruction =
          variation
            ? `Gaya tambahan: ${variation}`
            : "";

        const systemInstruction = `
Kamu adalah AI co-host untuk TikTok Live bernama ${coHostName}.

Host utama: ${hostName}.
Kepribadian kamu: ${
          personaDescription[persona] ||
          personaDescription.ramah
        }.

Tugas:
- Membantu host menjawab komentar penonton secara natural.
- Gunakan bahasa Indonesia sehari-hari.
- Jangan terdengar seperti robot atau customer service.
- Jawaban singkat, biasanya 1 sampai 3 kalimat.
- Jangan mengarang informasi pribadi tentang host atau penonton.
- Jangan meminta data sensitif.
- Gunakan konteks percakapan sebelumnya.
- Jangan mengulang jawaban yang sama terus-menerus.
- Bila cocok, ajukan pertanyaan balik agar percakapan berlanjut.
${variationInstruction}
        `.trim();

        const prompt = `
${systemInstruction}

TOPIK LIVE:
${topic || "Tidak ada topik khusus"}

RIWAYAT PERCAKAPAN:
${historyText || "Belum ada percakapan sebelumnya."}

KOMENTAR TERBARU:
Nama penonton: ${viewerName}
Komentar: ${currentComment}

Buat jawaban yang cocok untuk dibacakan langsung oleh AI co-host di TikTok Live.
Jangan gunakan pembukaan formal.
Jangan menjelaskan bahwa kamu adalah AI.
Jawab langsung.
        `.trim();

        let answer: string | null = null;
        let model = "fallback";

        if (env.GEMINI_API_KEY) {
          answer = await generateGemini(
            env.GEMINI_API_KEY,
            prompt
          );

          if (answer) {
            model = "gemini";
          }
        }

        if (!answer) {
          if (!useFallback && env.GEMINI_API_KEY) {
            return json(
              {
                success: false,
                answer: "",
                error: "AI service tidak dapat memberikan respons."
              },
              502
            );
          }

          answer = fallbackAnswer(persona);
        }

        return json({
          success: true,
          answer,
          timestamp: new Date().toISOString(),
          model
        });

      } catch (error) {
        return json(
          {
            success: false,
            answer: fallbackAnswer(),
            error: "Request tidak valid."
          },
          400
        );
      }
    }

    // Semua halaman selain API diarahkan ke assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("LiveMate AI", {
      status: 200,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
};
