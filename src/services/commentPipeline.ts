import {
  ChatMessage,
  CommentSourceId,
  ConnectionStatus,
  PipelineDebugInfo,
  QueuedComment,
  RawComment,
  ResponseValidationStatus,
  ResponseVariation,
} from '../types';
import { commentSourceManager } from './commentSource';
import { ttsService } from '../utils/tts';
import { ResponseValidator } from './responseValidator';

export interface FilterResult {
  passed: boolean;
  reason?: string;
}

export interface RateLimitState {
  currentCount: number; // Responses used this minute
  responsesUsedThisMinute: number; // Explicit alias
  maxPerMinute: number; // Default 10
  isThrottled: boolean;
  resetInSeconds: number;
}

/**
 * Filter Lokal untuk menyaring komentar sebelum masuk antrean aktif AI.
 * Sesuai instruksi:
 * - ignore empty comments
 * - ignore emoji-only comments
 * - ignore obvious repeated spam
 * - ignore excessive duplicate comments from the same user
 */
export class CommentFilter {
  /**
   * Cek apakah teks hanya berisi emoji/simbol tanpa kata atau teks bermakna
   */
  public static isEmojiOnly(text: string): boolean {
    if (!text || !text.trim()) return false;
    // Hapus karakter emoji, simbol unicode, tanda baca, dan spasi
    const stripped = text
      .replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
        ''
      )
      .replace(/[^\p{L}\p{N}]/gu, '')
      .trim();
    return stripped.length === 0;
  }

  /**
   * Cek apakah komentar merupakan pertanyaan
   */
  public static isQuestion(text: string): boolean {
    if (text.includes('?')) return true;
    const questionRegex =
      /\b(apa|siapa|kapan|dimana|di mana|kemana|ke mana|kenapa|mengapa|bagaimana|gimana|berapa|adakah|bolehkah|bisakah|bisa|kok|apakah|spill|rekomendasi|harga|promo|diskon|ready|rekomen|nggak|kah|beneran|serius)\b/i;
    return questionRegex.test(text);
  }

  /**
   * Cek apakah komentar merupakan interaksi langsung (menyapa host/co-host, panggilan, dsb.)
   */
  public static isDirectInteraction(
    text: string,
    hostName?: string,
    coHostName?: string
  ): boolean {
    const lower = text.toLowerCase();
    // Jika menyebut nama host atau nama co-host
    if (hostName && hostName.trim() && lower.includes(hostName.trim().toLowerCase())) {
      return true;
    }
    if (coHostName && coHostName.trim() && lower.includes(coHostName.trim().toLowerCase())) {
      return true;
    }
    // Kata sapaan langsung atau ajakan interaksi
    const directRegex =
      /\b(kak|kakak|bang|min|mimin|host|cohost|halo|hai|assalamualaikum|pagi|siang|malam|kamu|lu|gais|guys|salam|tolong|coba|pantun|tebak|tebakan|nyanyi|sapa|notice)\b/i;
    return directRegex.test(text);
  }

  /**
   * Deteksi spam berulang (pola karakter atau kata berulang berlebihan)
   */
  public static isObviousSpam(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 3) return false;

    // Deteksi huruf yang sama diulang lebih dari 6 kali berturut-turut (misal: "aaaaaaa", "wwwwwww", "kkkkkk")
    if (/(.)\1{6,}/i.test(trimmed)) {
      return true;
    }

    // Deteksi pengulangan kata yang sama lebih dari 4 kali (misal: "test test test test test")
    const words = trimmed.split(/\s+/);
    if (words.length >= 4) {
      const firstWord = words[0].toLowerCase();
      const allSame = words.every((w) => w.toLowerCase() === firstWord);
      if (allSame) return true;
    }

    return false;
  }

  /**
   * Deteksi komentar duplikat berlebihan dari penonton yang sama
   */
  public static isExcessiveUserDuplicate(
    comment: RawComment,
    recentHistory: QueuedComment[]
  ): boolean {
    const now = comment.timestamp || Date.now();
    const userNorm = comment.username.trim().toLowerCase();
    const textNorm = comment.text.trim().toLowerCase().replace(/\s+/g, ' ');

    // 1. Cek jika user yang sama mengirim komentar identik dalam 45 detik terakhir
    const duplicateSameUser = recentHistory.some((item) => {
      if (now - item.timestamp > 45000) return false;
      const itemUser = item.username.trim().toLowerCase();
      const itemText = item.text.trim().toLowerCase().replace(/\s+/g, ' ');
      return itemUser === userNorm && itemText === textNorm;
    });
    if (duplicateSameUser) {
      return true;
    }

    // 2. Cek jika penonton manapun mengirim komentar teks identik dalam 25 detik terakhir (global duplicate)
    const duplicateGlobal = recentHistory.some((item) => {
      if (now - item.timestamp > 25000) return false;
      const itemText = item.text.trim().toLowerCase().replace(/\s+/g, ' ');
      return itemText === textNorm;
    });
    if (duplicateGlobal) {
      return true;
    }

    // 3. Cek burst spam dari user yang sama (lebih dari 3 komentar dalam 8 detik)
    const userBursts = recentHistory.filter((item) => {
      if (now - item.timestamp > 8000) return false;
      return item.username.trim().toLowerCase() === userNorm;
    });
    if (userBursts.length >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Evaluasi kelayakan komentar dengan filter lokal
   */
  public static evaluate(
    comment: RawComment,
    recentHistory: QueuedComment[],
    hostName?: string,
    coHostName?: string
  ): FilterResult {
    const trimmed = comment.text ? comment.text.trim() : '';

    // 1. Ignore empty comments
    if (!trimmed) {
      return { passed: false, reason: 'Komentar kosong' };
    }

    // 2. Ignore emoji-only comments
    if (this.isEmojiOnly(trimmed)) {
      return { passed: false, reason: 'Hanya emoji tanpa teks' };
    }

    // 3. Ignore obvious repeated spam
    if (this.isObviousSpam(trimmed)) {
      return { passed: false, reason: 'Spam berulang' };
    }

    // 4. Ignore excessive duplicate comments from the same user
    if (this.isExcessiveUserDuplicate(comment, recentHistory)) {
      return { passed: false, reason: 'Komentar duplikat berulang dari user' };
    }

    return { passed: true };
  }
}

export interface AIAnswerResult {
  answer: string;
  isValid: boolean;
  status: ResponseValidationStatus;
  isFallback?: boolean;
  retryCount?: number;
  error?: string;
}

export type AIAnswerHandler = (
  comment: QueuedComment
) => Promise<AIAnswerResult | string | null>;

/**
 * Comment Engine yang mengelola aliran komentar:
 * Comment Source -> Filter -> Queue -> AI Conversation -> Response -> TTS
 */
export class CommentPipelineService {
  private queue: QueuedComment[] = [];
  private listeners: Array<(queue: QueuedComment[]) => void> = [];
  private rateListeners: Array<(rateState: RateLimitState) => void> = [];
  private processingListeners: Array<(current: QueuedComment | null) => void> = [];
  private validationListeners: Array<(status: ResponseValidationStatus) => void> = [];

  // Status Validasi Respon Terakhir (Valid | Retry | Failed | Fallback)
  private lastValidationStatus: ResponseValidationStatus = 'idle';

  // Riwayat jawaban per menit (Rate Limiting)
  private answeredTimestamps: number[] = [];
  private maxAnswersPerMinute = 10; // Default 10 responses per minute

  // Konfigurasi Auto Response & Pause
  private autoResponse = false; // When OFF: enters queue, AI does not auto answer. When ON: eligible comments processed automatically.
  private isAiPaused = false;

  // State Processing (only one AI response is generated at a time)
  private isProcessing = false;
  private currentProcessingComment: QueuedComment | null = null;
  private lastAnsweredComment: QueuedComment | null = null;
  private aiAnswerHandler: AIAnswerHandler | null = null;
  private queueCheckInterval: ReturnType<typeof setInterval> | null = null;
  private hostName = 'Kak Rian';
  private coHostName = 'Luna AI';
  private persona = 'ramah';
  private topic = 'Fashion & OOTD Casual Santai';
  private conversationHistory: ChatMessage[] = [];
  private lastDebugInfo: PipelineDebugInfo | null = null;

  constructor() {
    // Default AI answer handler calling /api/chat/respond with Gemini and validation
    this.aiAnswerHandler = (comment) => this.callGeminiAPI(comment);

    // Hubungkan ke CommentSourceManager
    commentSourceManager.subscribe((rawComment) => {
      this.ingestComment(rawComment);
    });

    // Jalankan scheduler antrean non-blocking setiap 350ms
    this.queueCheckInterval = setInterval(() => {
      this.cleanRateLimiterWindow();
      this.processQueue();
    }, 350);
  }

  public async callGeminiAPI(
    comment: QueuedComment,
    variation = 'default'
  ): Promise<AIAnswerResult> {
    const makeRequest = async (forceSimulateError?: boolean) => {
      const resp = await fetch('/api/chat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: this.hostName || 'Host',
          coHostName: this.coHostName || 'LiveMate AI',
          persona: this.persona || 'ramah',
          topic: this.topic || 'Ngobrol Santai & Q&A',
          currentComment: comment.text,
          viewerName: comment.username,
          history: this.conversationHistory.slice(0, 8),
          variation,
          simulateError: forceSimulateError !== undefined ? forceSimulateError : comment.simulateError,
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error: ${resp.status}`);
      }

      const data = await resp.json();
      return data.answer as string;
    };

    this.lastDebugInfo = {
      originalComment: comment.text,
      aiRequestCreated: true,
      aiResponseReceived: false,
      extractedText: '',
      validationResult: 'idle',
      timestamp: Date.now(),
    };

    try {
      const rawAnswer = await makeRequest();
      this.lastDebugInfo.aiResponseReceived = true;
      this.lastDebugInfo.extractedText = rawAnswer;

      let validation = ResponseValidator.validate(rawAnswer);
      if (validation.isValid) {
        this.lastDebugInfo.validationResult = 'valid';
        return {
          answer: validation.normalizedText,
          isValid: true,
          status: 'valid',
        };
      }

      // If invalid, initiate 1x automatic retry
      console.warn('AI response failed validation on attempt 1:', validation.reason, 'Initiating 1x retry...');
      this.notifyValidation('retry');
      comment.validationStatus = 'retry';
      this.notifyQueue();

      await new Promise((r) => setTimeout(r, 600));
      const retryAnswer = await makeRequest();
      this.lastDebugInfo.extractedText = retryAnswer;
      validation = ResponseValidator.validate(retryAnswer);

      if (validation.isValid) {
        this.lastDebugInfo.validationResult = 'valid';
        return {
          answer: validation.normalizedText,
          isValid: true,
          status: 'valid',
          retryCount: 1,
        };
      }

      // Retry still failed -> Safe friendly fallback response
      console.warn('AI response failed validation after retry:', validation.reason, 'Using fallback');
      const fallback = ResponseValidator.getSafeFallback(this.coHostName || 'LiveMate AI', this.persona, comment.username);
      this.lastDebugInfo.validationResult = 'fallback';
      this.lastDebugInfo.validationFailureReason = validation.reason;
      return {
        answer: fallback,
        isValid: false,
        status: 'fallback',
        isFallback: true,
        retryCount: 1,
        error: validation.reason,
      };
    } catch (err: any) {
      console.error('Error contacting Gemini API:', err);
      this.lastDebugInfo.validationResult = comment.simulateError ? 'failed' : 'fallback';
      this.lastDebugInfo.validationFailureReason = err?.message || 'API request failed';

      if (comment.simulateError) {
        return {
          answer: '',
          isValid: false,
          status: 'failed',
          error: err?.message || 'Simulated error',
        };
      }

      const fallback = ResponseValidator.getSafeFallback(this.coHostName || 'LiveMate AI', this.persona, comment.username);
      return {
        answer: fallback,
        isValid: false,
        status: 'fallback',
        isFallback: true,
        error: err?.message || 'Network error',
      };
    }
  }

  public setHostInfo(hostName: string, coHostName: string) {
    this.hostName = hostName;
    this.coHostName = coHostName;
  }

  public setAIAnswerHandler(handler: AIAnswerHandler) {
    this.aiAnswerHandler = handler;
  }

  public setMaxAnswersPerMinute(limit: number) {
    this.maxAnswersPerMinute = Math.max(1, Math.min(60, limit));
    this.notifyRateLimit();
  }

  public setAutoResponse(enabled: boolean) {
    const prev = this.autoResponse;
    this.autoResponse = enabled;
    // Jika baru saja diubah menjadi ON, segera periksa antrean untuk diproses
    if (!prev && enabled) {
      this.processQueue();
    }
  }

  public isAutoResponseOn(): boolean {
    return this.autoResponse;
  }

  public setAiPaused(paused: boolean) {
    this.isAiPaused = paused;
    if (!paused && this.autoResponse) {
      this.processQueue();
    }
  }

  public getQueue(): QueuedComment[] {
    return [...this.queue];
  }

  public getWaitingCount(): number {
    return this.queue.filter((c) => c.status === 'waiting').length;
  }

  public getCurrentProcessingComment(): QueuedComment | null {
    return this.currentProcessingComment;
  }

  public clearQueue() {
    this.queue = [];
    this.answeredTimestamps = [];
    this.currentProcessingComment = null;
    this.notifyQueue();
    this.notifyRateLimit();
    this.notifyProcessing();
  }

  /**
   * Titik masuk komentar dari Comment Source (Manual, Real-time, atau Simulasi)
   */
  public ingestComment(raw: RawComment): QueuedComment {
    const isQuestion = CommentFilter.isQuestion(raw.text);
    const isDirectInteraction = CommentFilter.isDirectInteraction(
      raw.text,
      this.hostName,
      this.coHostName
    );

    // Evaluasi filter lokal
    const filterResult = CommentFilter.evaluate(
      raw,
      this.queue,
      this.hostName,
      this.coHostName
    );

    // Prioritas antrean: pertanyaan & interaksi langsung mendapat prioritas lebih tinggi (3 vs 1)
    const priority = isQuestion || isDirectInteraction ? 3 : 1;

    const queuedItem: QueuedComment = {
      id: raw.id || `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: raw.username || 'Penonton',
      text: raw.text,
      timestamp: raw.timestamp || Date.now(),
      status: filterResult.passed ? 'waiting' : 'ignored',
      source: raw.source || commentSourceManager.getActiveSource().id || 'manual',
      ignoreReason: filterResult.reason,
      isQuestion,
      isDirectInteraction,
      priority,
      simulateError: raw.simulateError,
    };

    // Simpan ke antrean/daftar komentar
    this.queue.unshift(queuedItem);

    // Batasi memori sesi LIVE agar performa tablet tetap optimal (maks 150 item)
    if (this.queue.length > 150) {
      this.queue = this.queue.slice(0, 150);
    }

    this.notifyQueue();

    // Jika AUTO RESPONSE aktif dan komentar lolos filter, trigger pengecekan antrean
    if (filterResult.passed && this.autoResponse) {
      this.processQueue();
    }

    return queuedItem;
  }

  public getRateLimitState(): RateLimitState {
    const now = Date.now();
    const validTimestamps = this.answeredTimestamps.filter((t) => now - t < 60000);
    const count = validTimestamps.length;
    const isThrottled = count >= this.maxAnswersPerMinute;
    let resetInSeconds = 0;
    if (isThrottled && validTimestamps.length > 0) {
      const oldest = validTimestamps[0];
      resetInSeconds = Math.max(1, Math.ceil((oldest + 60000 - now) / 1000));
    }

    return {
      currentCount: count,
      responsesUsedThisMinute: count,
      maxPerMinute: this.maxAnswersPerMinute,
      isThrottled,
      resetInSeconds,
    };
  }

  private cleanRateLimiterWindow() {
    const now = Date.now();
    const prevCount = this.answeredTimestamps.length;
    this.answeredTimestamps = this.answeredTimestamps.filter((t) => now - t < 60000);
    if (this.answeredTimestamps.length !== prevCount) {
      this.notifyRateLimit();
    }
  }

  /**
   * Memproses antrean satu per satu secara sequential:
   * - questions and direct interactions get higher priority
   * - only one AI response is generated at a time
   * - when AUTO RESPONSE is OFF: comments enter queue, but AI must not automatically answer
   * - when AUTO RESPONSE is ON: eligible comments can be processed automatically
   * - TTS must never overlap
   */
  private async processQueue() {
    if (this.isProcessing) return;
    if (this.isAiPaused) return;
    if (!this.aiAnswerHandler) return;

    if (!this.autoResponse) {
      return;
    }

    const rateState = this.getRateLimitState();
    if (rateState.isThrottled) {
      return;
    }

    const pendingComments = this.queue
      .filter((c) => c.status === 'waiting')
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

    if (pendingComments.length === 0) {
      return;
    }

    const nextComment = pendingComments[0];
    await this.executeCommentAnswer(nextComment, true);
  }

  /**
   * Eksekusi jawaban untuk satu komentar tertentu
   */
  public async executeCommentAnswer(
    comment: QueuedComment,
    isAutoTriggered = false,
    forceRegenerate = false
  ): Promise<string | null> {
    if (this.isProcessing || !this.aiAnswerHandler) return null;

    if (comment.status === 'answered' && comment.answer && !forceRegenerate) {
      console.warn('Comment already answered, preventing duplicate generation:', comment.id);
      return comment.answer;
    }

    this.isProcessing = true;
    this.currentProcessingComment = comment;
    comment.status = 'processing';
    this.notifyQueue();
    this.notifyProcessing();

    try {
      const rawResult = await this.aiAnswerHandler(comment);
      let answerText = '';
      let isValid = false;
      let status: ResponseValidationStatus = 'failed';
      let isFallback = false;
      let errorMessage = '';

      if (rawResult && typeof rawResult === 'object' && 'status' in rawResult) {
        answerText = rawResult.answer || '';
        isValid = rawResult.isValid;
        status = rawResult.status;
        isFallback = !!rawResult.isFallback;
        errorMessage = rawResult.error || '';
      } else if (typeof rawResult === 'string') {
        const val = ResponseValidator.validate(rawResult);
        answerText = val.normalizedText;
        isValid = val.isValid;
        status = val.isValid ? 'valid' : 'failed';
        errorMessage = val.reason || '';
      }

      this.notifyValidation(status);
      comment.validationStatus = status;

      if (isValid && answerText) {
        comment.status = 'answered';
        comment.answer = answerText;
        comment.answeredAt = Date.now();
        comment.isFallback = false;
        comment.error = undefined;
        this.lastAnsweredComment = comment;

        this.answeredTimestamps.push(Date.now());
        this.notifyRateLimit();

        if (this.autoResponse) {
          ttsService.speak(answerText);
        }
        return answerText;
      } else if (isFallback && answerText) {
        comment.status = 'failed';
        comment.answer = answerText;
        comment.isFallback = true;
        comment.error = errorMessage || 'AI response failed validation, using fallback';
        comment.validationStatus = 'fallback';
        this.lastAnsweredComment = comment;
        this.notifyValidation('fallback');

        if (this.autoResponse) {
          ttsService.speak(answerText);
        }
        return answerText;
      } else {
        comment.status = 'failed';
        comment.error = errorMessage || 'Jawaban AI kosong atau tidak valid';
        comment.validationStatus = 'failed';
        this.notifyValidation('failed');
        return null;
      }
    } catch (err: any) {
      console.error('Error in Comment Engine pipeline:', err);
      comment.status = 'failed';
      comment.error = err?.message || 'Gagal memproses jawaban AI';
      comment.validationStatus = 'failed';
      this.notifyValidation('failed');
      return null;
    } finally {
      this.isProcessing = false;
      this.currentProcessingComment = null;
      this.notifyQueue();
      this.notifyProcessing();

      if (this.autoResponse && isAutoTriggered) {
        setTimeout(() => {
          this.processQueue();
        }, 350);
      }
    }
  }

  public updateConfig(config: {
    hostName?: string;
    coHostName?: string;
    persona?: string;
    topic?: string;
    autoResponse?: boolean;
    isAiPaused?: boolean;
    maxAnswersPerMinute?: number;
  }) {
    if (config.hostName !== undefined) this.hostName = config.hostName;
    if (config.coHostName !== undefined) this.coHostName = config.coHostName;
    if (config.persona !== undefined) this.persona = config.persona;
    if (config.topic !== undefined) this.topic = config.topic;
    if (config.autoResponse !== undefined) this.setAutoResponse(config.autoResponse);
    if (config.isAiPaused !== undefined) this.setAiPaused(config.isAiPaused);
    if (config.maxAnswersPerMinute !== undefined) this.setMaxAnswersPerMinute(config.maxAnswersPerMinute);
  }

  public setConversationHistory(history: ChatMessage[]) {
    this.conversationHistory = history;
  }

  public ingestRawComment(raw: RawComment): QueuedComment {
    return this.ingestComment(raw);
  }

  public switchSource(sourceId: CommentSourceId): void {
    commentSourceManager.setSource(sourceId);
    this.notifyQueue();
  }

  public reconnectSource(): void {
    commentSourceManager.reconnect();
    this.notifyQueue();
  }

  public async processCommentOnDemand(commentId: string): Promise<string | null> {
    const comment = this.queue.find((c) => c.id === commentId);
    if (!comment) return null;
    return this.executeCommentAnswer(comment, false, true);
  }

  public async requestResponseVariation(
    viewerName: string,
    commentText: string,
    variation: ResponseVariation,
    _existingAnswer?: string
  ): Promise<string> {
    const fakeComment: QueuedComment = {
      id: `var-${Date.now()}`,
      username: viewerName,
      text: commentText,
      timestamp: Date.now(),
      status: 'processing',
      source: 'manual',
      priority: 3,
    };

    const res = await this.callGeminiAPI(fakeComment, variation);
    if (res.answer) {
      this.answeredTimestamps.push(Date.now());
      this.notifyRateLimit();
      return res.answer;
    }
    throw new Error(res.error || 'Gagal menghasilkan variasi respon');
  }

  public getLastValidationStatus(): ResponseValidationStatus {
    return this.lastValidationStatus;
  }

  public onValidationChange(
    listener: (status: ResponseValidationStatus) => void
  ): () => void {
    this.validationListeners.push(listener);
    listener(this.lastValidationStatus);
    return () => {
      this.validationListeners = this.validationListeners.filter((l) => l !== listener);
    };
  }

  public notifyValidation(status: ResponseValidationStatus) {
    this.lastValidationStatus = status;
    this.validationListeners.forEach((l) => l(status));
  }

  public getCompositeState() {
    const currentQueue = this.getQueue();
    const stateObj = {
      queue: currentQueue,
      rateLimit: this.getRateLimitState(),
      connectionStatus: commentSourceManager.getStatus(),
      activeSource: commentSourceManager.getActiveSourceId(),
      isProcessing: this.isProcessing,
      currentProcessing: this.currentProcessingComment,
      lastAnswered: this.lastAnsweredComment,
      validationStatus: this.lastValidationStatus,
      lastDebugInfo: this.lastDebugInfo,
    };
    return Object.assign([...currentQueue], stateObj);
  }

  public subscribe(listener: (state: any) => void): () => void {
    this.listeners.push(listener);
    listener(this.getCompositeState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public onRateLimitChange(listener: (rateState: RateLimitState) => void): () => void {
    this.rateListeners.push(listener);
    listener(this.getRateLimitState());
    return () => {
      this.rateListeners = this.rateListeners.filter((l) => l !== listener);
    };
  }

  public onProcessingChange(
    listener: (current: QueuedComment | null) => void
  ): () => void {
    this.processingListeners.push(listener);
    listener(this.currentProcessingComment);
    return () => {
      this.processingListeners = this.processingListeners.filter((l) => l !== listener);
    };
  }

  private notifyQueue() {
    const composite = this.getCompositeState();
    this.listeners.forEach((l) => {
      try {
        l(composite);
      } catch (e) {
        console.warn('Listener error in commentPipeline:', e);
      }
    });
  }

  private notifyRateLimit() {
    const r = this.getRateLimitState();
    this.rateListeners.forEach((l) => l(r));
  }

  private notifyProcessing() {
    const c = this.currentProcessingComment;
    this.processingListeners.forEach((l) => l(c));
  }
}

export const commentPipeline = new CommentPipelineService();
export const commentPipelineService = commentPipeline;

/**
 * TEST MODE: Simulate Comments
 * Menghasilkan komentar contoh yang masuk ke Comment Engine melalui SimulationCommentSource
 */
export function runCommentSimulation(
  onStep?: (index: number, total: number, comment: RawComment) => void
): void {
  commentSourceManager.getSimulationSource().runSimulation(onStep);
}
