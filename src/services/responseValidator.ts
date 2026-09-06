/**
 * Strict Response Validation & Normalization Layer
 * Pipeline: AI Generation -> Response Validation -> TTS Queue
 * Sesuai Aturan Sistem:
 * 1. Respon VALID hanya jika:
 *    - berisi teks nyata
 *    - bukan string kosong atau spasi saja
 *    - bukan "undefined", "null", "[object Object]", "NaN"
 *    - bukan pesan error mentah dari server/API
 *    - layak untuk disuarakan (memiliki kata/huruf yang dapat dilafalkan)
 * 2. Mencegah respon kosong/cacat/error masuk ke antrean suara (TTS).
 * 3. Menormalkan teks: menghapus tanda kutip luar, spasi berlebih, menjaga kealamian Bahasa Indonesia.
 * 4. Menyediakan pesan fallback santai jika percobaan & retry gagal.
 */

export type ResponseValidationStatus = 'idle' | 'valid' | 'retry' | 'failed' | 'fallback';

export interface ValidationResult {
  isValid: boolean;
  normalizedText: string;
  reason?: string;
  isErrorMessage?: boolean;
}

export const FRIENDLY_FALLBACK_RESPONSE = 'Maaf, tadi aku belum nangkep 😅 Coba ulangi lagi ya.';

export class ResponseValidator {
  public static readonly FALLBACK_RESPONSE = FRIENDLY_FALLBACK_RESPONSE;

  public static getFallbackResponse(): string {
    return FRIENDLY_FALLBACK_RESPONSE;
  }

  public static getSafeFallback(coHostName?: string, _persona?: string, viewerName?: string): string {
    const greeting = viewerName && viewerName !== 'Penonton' ? `Halo @${viewerName}! ` : '';
    const name = coHostName || 'LiveMate AI';
    const fallbacks = [
      `${greeting}Wah seru banget komentarnya! Tetap stay dan ramaikan LIVE ya gais! 😊`,
      `${greeting}Bisa diulang pertanyaannya? Tadi aku agak terlewat nih hehe 😅`,
      `${greeting}Yuk yang baru gabung langsung tap-tap layar dan absen di chat ya! ✨`,
      `${greeting}Halo! Senang banget bisa nemenin kalian bareng Kak Host hari ini! 🙌`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Kata-kata atau representasi malformed yang dilarang keras
   */
  private static readonly DISALLOWED_LITERALS = new Set([
    'undefined',
    'null',
    '[object object]',
    '{}',
    '[]',
    'nan',
    'nil',
    'none',
    'void',
    'false',
    'true',
  ]);

  /**
   * Pola regex yang mendeteksi pesan error API mentah atau stack trace
   */
  private static readonly ERROR_PATTERNS = [
    /^(error|internal server error|http \d+|500|404|429|403|400|api error|gemini api error|fetch failed|failed to fetch|network error|typeerror|referenceerror|syntaxerror|unhandled rejection|status:)/i,
    /(internal server error|quota exceeded|rate limit exceeded|bad request|unauthorized|failed to generate content|gagal memproses respon ai dari server)/i,
    /^{.*"error":.*}$/s,
    /^{.*"success":\s*false.*}$/s,
    /\[GoogleGenerativeAI Error\]/i,
    /RESOURCE_EXHAUSTED/i,
    /DEADLINE_EXCEEDED/i,
  ];

  /**
   * Mengecek apakah string adalah JSON mentah yang belum di-parse
   */
  private static isRawJson(str: string): boolean {
    const trimmed = str.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return typeof parsed === 'object' && parsed !== null;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Ekstraksi teks aman dari sembarang tipe kembalian (string, object, dsb.)
   */
  public static extractText(raw: unknown): string {
    if (raw === null || raw === undefined) {
      return '';
    }
    if (typeof raw === 'string') {
      return raw;
    }
    if (typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.answer === 'string') {
        return obj.answer;
      }
      if (typeof obj.text === 'string') {
        return obj.text;
      }
      if (typeof obj.response === 'string') {
        return obj.response;
      }
      if (typeof obj.message === 'string') {
        return obj.message;
      }
      return '';
    }
    return String(raw);
  }

  /**
   * Normalisasi respon AI:
   * - potong spasi luar
   * - hilangkan tanda kutip pembungkus ("..." atau '...')
   * - gabungkan spasi ganda menjadi tunggal
   * - jaga kealamian kata & emoji Bahasa Indonesia
   */
  public static normalize(raw: unknown): string {
    let text = this.extractText(raw).trim();
    if (!text) return '';

    // Hilangkan pembungkus tanda kutip jika seluruh kalimat terbungkus
    if (
      (text.startsWith('"') && text.endsWith('"') && text.length >= 2) ||
      (text.startsWith("'") && text.endsWith("'") && text.length >= 2) ||
      (text.startsWith('“') && text.endsWith('”') && text.length >= 2)
    ) {
      text = text.slice(1, -1).trim();
    }

    // Hilangkan awalan seperti "Respon:", "Jawaban:", "AI:", "Co-Host:"
    text = text.replace(/^(respon|jawaban|co-host|ai|luna|luna ai)\s*:\s*/i, '').trim();

    // Rampingkan spasi berlebih
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Validasi ketat respon AI
   */
  public static validate(raw: unknown): ValidationResult {
    // 1. Cek null / undefined
    if (raw === null || raw === undefined) {
      return {
        isValid: false,
        normalizedText: '',
        reason: 'Respon tidak boleh kosong (null atau undefined)',
      };
    }

    // 2. Ekstraksi dan normalisasi
    const normalized = this.normalize(raw);

    // 3. Cek apakah kosong atau hanya spasi
    if (!normalized || normalized.length === 0) {
      return {
        isValid: false,
        normalizedText: '',
        reason: 'Teks respon kosong atau hanya spasi',
      };
    }

    const lower = normalized.toLowerCase();

    // 4. Cek literal terlarang ("undefined", "null", "[object Object]", dll)
    if (this.DISALLOWED_LITERALS.has(lower)) {
      return {
        isValid: false,
        normalizedText: '',
        reason: `Teks merupakan literal terlarang ("${normalized}")`,
      };
    }

    // 5. Cek apakah teks berupa JSON object mentah
    if (this.isRawJson(normalized)) {
      return {
        isValid: false,
        normalizedText: '',
        reason: 'Teks merupakan data JSON mentah, bukan kalimat obrolan',
        isErrorMessage: true,
      };
    }

    // 6. Cek apakah teks merupakan pesan error teknis
    for (const pattern of this.ERROR_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          isValid: false,
          normalizedText: '',
          reason: 'Teks terdeteksi sebagai pesan error teknis API/Server',
          isErrorMessage: true,
        };
      }
    }

    // 7. Cek kelayakan untuk disuarakan
    const hasSpokenLetters = /[a-zA-Z0-9\u00C0-\u024F]/.test(normalized);
    if (!hasSpokenLetters) {
      return {
        isValid: false,
        normalizedText: '',
        reason: 'Teks hanya berisi simbol atau tanda baca dan tidak dapat disuarakan',
      };
    }

    // Lolos seluruh kriteria validasi ketat
    return {
      isValid: true,
      normalizedText: normalized,
    };
  }

  /**
   * Validasi apakah teks aman dan layak dikirimkan ke Web Speech API TTS
   */
  public static validateForSpeech(raw: unknown): boolean {
    if (raw === null || raw === undefined) return false;
    if (typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (this.DISALLOWED_LITERALS.has(lower)) return false;
    if (this.isRawJson(trimmed)) return false;
    for (const pattern of this.ERROR_PATTERNS) {
      if (pattern.test(trimmed)) return false;
    }
    return /[a-zA-Z0-9\u00C0-\u024F]/.test(trimmed);
  }
}
