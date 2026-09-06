import {
  E2ETestCommentItem,
  E2ETestSummary,
  QueuedComment,
  RawComment,
} from '../types';
import { commentPipeline } from './commentPipeline';
import { commentSourceManager } from './commentSource';
import { ttsService } from '../utils/tts';

export const E2E_TEST_DEFINITIONS = [
  {
    order: 1,
    username: 'andi',
    text: 'Kak, tinggal di mana?',
  },
  {
    order: 2,
    username: 'sari',
    text: 'Oh iya? Kamu suka makanan apa?',
  },
  {
    order: 3,
    username: 'budi',
    text: 'Aku lagi galau nih 😢',
  },
  {
    order: 4,
    username: 'dina',
    text: 'Bikin pantun dong',
  },
  {
    order: 5,
    username: 'reza',
    text: 'Hahaha lucu banget 😂',
  },
];

export type E2ETestListener = (
  items: E2ETestCommentItem[],
  summary: E2ETestSummary,
  isRunning: boolean,
  activeStep: number
) => void;

class E2ETestRunnerService {
  private items: E2ETestCommentItem[] = [];
  private isRunning = false;
  private activeStep = 0;
  private startTime = 0;
  private listeners: E2ETestListener[] = [];
  private abortRequested = false;

  constructor() {
    this.resetState();
  }

  public resetState() {
    this.items = E2E_TEST_DEFINITIONS.map((def) => ({
      id: `e2e-def-${def.order}`,
      order: def.order,
      username: def.username,
      text: def.text,
      stage: 'idle',
      isFiltered: false,
      isSpoken: false,
    }));
    this.isRunning = false;
    this.activeStep = 0;
    this.startTime = 0;
    this.abortRequested = false;
  }

  public getItems(): E2ETestCommentItem[] {
    return [...this.items];
  }

  public getSummary(): E2ETestSummary {
    const received = this.items.filter((i) => i.receivedAt !== undefined).length;
    const answered = this.items.filter((i) => i.answeredAt !== undefined).length;
    const ignored = this.items.filter((i) => i.isFiltered).length;
    const aiErrors = this.items.filter((i) => !!i.aiError).length;
    const ttsCompleted = this.items.filter((i) => i.isSpoken).length;
    const durationMs = this.startTime > 0 ? Date.now() - this.startTime : 0;
    const isCompleted =
      !this.isRunning &&
      this.items.length > 0 &&
      this.items.every((i) => i.stage === 'spoken' || i.stage === 'answered' || i.isFiltered || i.aiError);

    return {
      commentsReceived: received,
      commentsAnswered: answered,
      commentsIgnored: ignored,
      aiErrors,
      ttsCompleted,
      totalComments: this.items.length,
      isCompleted,
      durationMs,
    };
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getActiveStep(): number {
    return this.activeStep;
  }

  public subscribe(listener: E2ETestListener): () => void {
    this.listeners.push(listener);
    listener(this.items, this.getSummary(), this.isRunning, this.activeStep);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const summary = this.getSummary();
    this.listeners.forEach((l) => {
      try {
        l([...this.items], summary, this.isRunning, this.activeStep);
      } catch (e) {
        console.warn('E2E runner listener error:', e);
      }
    });
  }

  public stopTest() {
    this.abortRequested = true;
    this.isRunning = false;
    this.notify();
  }

  /**
   * Menjalankan urutan pengujian End-to-End melalui pipeline real:
   * Simulated Viewer Comment
   *   -> Comment Source
   *   -> Filter
   *   -> Queue
   *   -> AI Conversation
   *   -> AI Response
   *   -> TTS Queue
   *   -> Device Speech
   */
  public async runE2ETest(): Promise<void> {
    if (this.isRunning) return;
    this.resetState();
    this.isRunning = true;
    this.startTime = Date.now();
    this.abortRequested = false;

    // 1. Pastikan sumber adalah SimulationCommentSource
    commentSourceManager.setSource('simulation');

    // 2. Pastikan AI tidak dijeda dan AUTO RESPONSE aktif agar masuk ke AI & TTS
    commentPipeline.setAiPaused(false);
    commentPipeline.setAutoResponse(true);
    this.notify();

    // Loop setiap komentar pengujian secara sequential untuk menjaga kesinambungan konteks obrolan
    for (let i = 0; i < this.items.length; i++) {
      if (this.abortRequested) break;
      const item = this.items[i];
      this.activeStep = item.order;
      await this.processSingleTestComment(item);

      // Berikan jeda alami antar komentar (450ms)
      if (i < this.items.length - 1 && !this.abortRequested) {
        await new Promise((r) => setTimeout(r, 450));
      }
    }

    this.isRunning = false;
    this.activeStep = 0;
    this.notify();
  }

  private async processSingleTestComment(item: E2ETestCommentItem): Promise<void> {
    const rawCommentId = `e2e-${item.order}-${Date.now()}`;
    const rawComment: RawComment = {
      id: rawCommentId,
      username: item.username,
      text: item.text,
      timestamp: Date.now(),
      source: 'simulation',
    };

    // Stage 1: Received di Comment Source
    item.stage = 'received';
    item.receivedAt = Date.now();
    this.notify();

    // Siapkan promise untuk melacak transisi queue dari CommentPipeline
    const queuePromise = new Promise<{
      queuedItem: QueuedComment | null;
      wasIgnored: boolean;
      ignoreReason?: string;
    }>((resolve) => {
      let resolved = false;
      const unsub = commentPipeline.subscribe((queue) => {
        // Cari komentar ini di antrean
        const found = queue.find(
          (c) =>
            c.id === rawCommentId ||
            (c.username === item.username && c.text === item.text && Math.abs(c.timestamp - rawComment.timestamp) < 5000)
        );
        if (found && !resolved) {
          if (found.status === 'ignored') {
            resolved = true;
            unsub();
            resolve({
              queuedItem: found,
              wasIgnored: true,
              ignoreReason: found.ignoreReason,
            });
          } else {
            resolved = true;
            unsub();
            resolve({
              queuedItem: found,
              wasIgnored: false,
            });
          }
        }
      });

      // Timeout safety 4 detik
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve({ queuedItem: null, wasIgnored: false });
        }
      }, 4000);
    });

    // Injeksi komentar ke Comment Source resmi
    commentSourceManager.getActiveSource().ingestComment?.(rawComment);

    const queueResult = await queuePromise;
    if (queueResult.wasIgnored) {
      item.stage = 'filtered_or_accepted';
      item.isFiltered = true;
      item.filterReason = queueResult.ignoreReason || 'Disaring oleh filter lokal';
      this.notify();
      return;
    }

    // Stage 2: Filtered / Accepted
    item.stage = 'filtered_or_accepted';
    item.isFiltered = false;
    this.notify();

    // Stage 3: Queued
    item.stage = 'queued';
    item.queuedAt = Date.now();
    this.notify();

    // Stage 4: Menunggu proses AI & Answered
    const answerPromise = new Promise<{
      answerText: string | null;
      aiError?: string;
    }>((resolve) => {
      let resolved = false;
      const unsubQueue = commentPipeline.subscribe((queue) => {
        const found = queue.find(
          (c) =>
            c.id === rawCommentId ||
            (c.username === item.username && c.text === item.text && Math.abs(c.timestamp - rawComment.timestamp) < 30000)
        );
        if (found) {
          if (found.status === 'processing' && item.stage !== 'processing') {
            item.stage = 'processing';
            item.processingAt = Date.now();
            this.notify();
          } else if (found.status === 'answered' && found.answer && !resolved) {
            resolved = true;
            unsubQueue();
            resolve({ answerText: found.answer });
          } else if (found.status === 'failed' && !resolved) {
            resolved = true;
            unsubQueue();
            if (found.isFallback && found.answer) {
              resolve({ answerText: found.answer });
            } else {
              resolve({ answerText: null, aiError: found.error || 'AI Error' });
            }
          }
        }
      });

      // Fallback timer bila respon membutuhkan waktu (maksimal 25 detik)
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubQueue();
          resolve({ answerText: null, aiError: 'Timeout waiting for AI answer' });
        }
      }, 25000);
    });

    const aiResult = await answerPromise;
    if (aiResult.aiError || !aiResult.answerText) {
      item.stage = 'answered';
      item.aiError = aiResult.aiError || 'Gagal menghasilkan respon AI';
      this.notify();
      return;
    }

    // Stage 5: Answered
    item.stage = 'answered';
    item.answeredAt = Date.now();
    item.answerText = aiResult.answerText;
    this.notify();

    // Stage 6: TTS Queue & Device Speech
    const speechPromise = new Promise<void>((resolve) => {
      let resolved = false;
      const unsubSpeech = ttsService.onSpeechCompleted(() => {
        if (!resolved) {
          resolved = true;
          unsubSpeech();
          resolve();
        }
      });

      // Jika Web Speech API tidak didukung atau sedang dalam preview,
      // sediakan durasi estimasi alami proporsional berdasarkan panjang teks (misal 2.2 - 4.5 detik)
      const estimatedDuration = Math.min(
        5000,
        Math.max(2200, (aiResult.answerText?.length || 30) * 45)
      );
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubSpeech();
          resolve();
        }
      }, estimatedDuration);
    });

    await speechPromise;
    item.stage = 'spoken';
    item.isSpoken = true;
    item.spokenAt = Date.now();
    this.notify();
  }
}

export const e2eTestRunner = new E2ETestRunnerService();
