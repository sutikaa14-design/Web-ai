/**
 * Text-to-Speech Engine menggunakan Web Speech API (Browser Synthesis)
 * Dioptimalkan untuk membaca jawaban AI Co-Host di tablet saat LIVE siaran.
 * 100% Gratis menggunakan kemampuan native browser / perangkat tanpa API key tambahan.
 */

import { ResponseValidator } from '../services/responseValidator';

export interface TTSState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  currentText: string | null;
  queue: string[];
  queueLength: number;
  rate: number; // 0.75 - 1.5 (default 1.0)
  volume: number; // 0.0 - 1.0 (default 1.0)
  hasIndonesianVoice: boolean;
  selectedVoiceName: string | null;
  availableVoices: Array<{ name: string; lang: string; isIndonesian: boolean }>;
}

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Array<(state: TTSState) => void> = [];
  private speechCompleteListeners: Array<(text: string, wasSuccessful: boolean) => void> = [];

  // Antrean pembacaan (Speech Queue)
  private queue: string[] = [];

  // Konfigurasi suara & volume
  private rate = 1.0;
  private volume = 1.0;
  private currentText: string | null = null;
  private isPaused = false;
  private selectedVoiceURI: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;

      // Load persistent preferences
      try {
        const savedRate = localStorage.getItem('livemate_tts_rate');
        if (savedRate) this.rate = parseFloat(savedRate) || 1.0;
        const savedVol = localStorage.getItem('livemate_tts_vol');
        if (savedVol !== null) this.volume = parseFloat(savedVol) ?? 1.0;
        const savedVoice = localStorage.getItem('livemate_tts_voice');
        if (savedVoice) this.selectedVoiceURI = savedVoice;
      } catch (e) {
        console.warn('Could not load TTS preferences', e);
      }

      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    try {
      this.voices = this.synth.getVoices();
      this.notifyState();
    } catch (e) {
      console.warn('Error loading speechSynthesis voices', e);
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  /**
   * Cari voice Bahasa Indonesia (id-ID atau id) pada perangkat.
   * Jika tidak tersedia, fallback secara halus ke voice browser yang ada.
   */
  public getBestVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length && this.synth) {
      this.voices = this.synth.getVoices();
    }
    if (!this.voices.length) return null;

    // 1. Cek apakah user telah memilih voice spesifik
    if (this.selectedVoiceURI) {
      const matched = this.voices.find(
        (v) => v.voiceURI === this.selectedVoiceURI || v.name === this.selectedVoiceURI
      );
      if (matched) return matched;
    }

    // 2. Cari voice Bahasa Indonesia
    const indonesianVoice = this.voices.find((v) => {
      const lang = (v.lang || '').toLowerCase();
      const name = (v.name || '').toLowerCase();
      return (
        lang.startsWith('id') ||
        lang.includes('indonesia') ||
        name.includes('indonesia') ||
        name.includes('bahasa')
      );
    });
    if (indonesianVoice) return indonesianVoice;

    // 3. Fallback ke voice browser default atau pertama
    const defaultVoice = this.voices.find((v) => v.default);
    return defaultVoice || this.voices[0] || null;
  }

  public setVoice(voiceURI: string | null) {
    this.selectedVoiceURI = voiceURI;
    try {
      if (voiceURI) {
        localStorage.setItem('livemate_tts_voice', voiceURI);
      } else {
        localStorage.removeItem('livemate_tts_voice');
      }
    } catch (e) {}
    this.notifyState();
  }

  public setRate(newRate: number) {
    this.rate = Math.max(0.7, Math.min(1.5, Math.round(newRate * 100) / 100));
    try {
      localStorage.setItem('livemate_tts_rate', this.rate.toString());
    } catch (e) {}
    this.notifyState();
  }

  public getRate(): number {
    return this.rate;
  }

  public setVolume(newVolume: number) {
    this.volume = Math.max(0, Math.min(1.0, Math.round(newVolume * 100) / 100));
    try {
      localStorage.setItem('livemate_tts_vol', this.volume.toString());
    } catch (e) {}
    this.notifyState();
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Membersihkan teks dari karakter yang mengganggu sintesis suara:
   * Menghilangkan emoji, simbol markdown tebal, asteriks, dsb.
   */
  private cleanTextForSpeech(text: string): string {
    return text
      .replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
        ''
      )
      .replace(/[*_~`#]/g, '')
      .replace(/[""“”]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Menambahkan teks ke dalam antrean suara (Speech Queue).
   * Jika tidak ada yang sedang berbicara, langsung mainkan item pertama.
   */
  public speak(
    text: string,
    onEndCallback?: () => void,
    onErrorCallback?: (err: string) => void
  ): boolean {
    if (!this.synth) {
      onErrorCallback?.('Web Speech API tidak didukung oleh browser ini.');
      return false;
    }

    if (!ResponseValidator.validateForSpeech(text)) {
      console.warn('TTS blocked invalid or unsuitable speech text:', text);
      return false;
    }

    // Jika sedang berbicara atau sedang pause, masukkan teks ke antrean (Queue)
    if (this.currentUtterance || (this.synth.speaking && !this.isPaused)) {
      this.queue.push(text);
      this.notifyState();
      return true;
    }

    // Jika sedang dalam keadaan pause tapi tidak ada utterance aktif, reset
    if (this.isPaused && !this.synth.speaking) {
      this.isPaused = false;
    }

    return this.processNextSpeech(text, onEndCallback, onErrorCallback);
  }

  /**
   * Menjalankan satu utterance pembacaan suara
   */
  private processNextSpeech(
    text: string,
    onEndCallback?: () => void,
    onErrorCallback?: (err: string) => void
  ): boolean {
    if (!this.synth) return false;

    if (!ResponseValidator.validateForSpeech(text)) {
      console.warn('TTS dropped invalid speech text in queue processing:', text);
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        setTimeout(() => this.processNextSpeech(next, onEndCallback, onErrorCallback), 50);
      }
      return false;
    }

    try {
      const cleanText = this.cleanTextForSpeech(text);
      const textToSpeak = cleanText || text;

      if (!ResponseValidator.validateForSpeech(textToSpeak)) {
        console.warn('TTS cleaned text is empty or unsuitable for speech, skipping:', text);
        if (this.queue.length > 0) {
          const next = this.queue.shift()!;
          setTimeout(() => this.processNextSpeech(next, onEndCallback, onErrorCallback), 50);
        }
        return false;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = this.rate;
      utterance.volume = this.volume;
      utterance.pitch = 1.0;
      utterance.lang = 'id-ID';

      const voice = this.getBestVoice();
      if (voice) {
        utterance.voice = voice;
      }

      this.currentUtterance = utterance;
      this.currentText = text;
      this.isPaused = false;

      utterance.onstart = () => {
        this.isPaused = false;
        this.notifyState();
      };

      utterance.onpause = () => {
        this.isPaused = true;
        this.notifyState();
      };

      utterance.onresume = () => {
        this.isPaused = false;
        this.notifyState();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        this.currentText = null;
        this.isPaused = false;
        this.notifyState();
        this.notifySpeechCompleted(text, true);
        onEndCallback?.();

        // Cek apakah ada antrean berikutnya di dalam queue
        if (this.queue.length > 0) {
          const nextText = this.queue.shift()!;
          setTimeout(() => {
            this.processNextSpeech(nextText);
          }, 250);
        }
      };

      utterance.onerror = (event) => {
        console.warn('SpeechSynthesis error:', event);
        this.currentUtterance = null;
        this.currentText = null;
        this.isPaused = false;
        this.notifyState();
        this.notifySpeechCompleted(text, false);
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          onErrorCallback?.(`Gagal membacakan teks: ${event.error}`);
        }
        if (event.error !== 'canceled' && this.queue.length > 0) {
          const nextText = this.queue.shift()!;
          setTimeout(() => {
            this.processNextSpeech(nextText);
          }, 250);
        }
      };

      this.synth.speak(utterance);
      this.notifyState();
      return true;
    } catch (err: unknown) {
      console.error('TTS process error:', err);
      this.currentUtterance = null;
      this.currentText = null;
      this.isPaused = false;
      this.notifyState();
      onErrorCallback?.('Terjadi kesalahan saat memproses suara.');
      return false;
    }
  }

  /**
   * Pause pembacaan suara
   */
  public pause() {
    if (this.synth && (this.synth.speaking || this.currentUtterance)) {
      try {
        this.synth.pause();
        this.isPaused = true;
        this.notifyState();
      } catch (e) {
        console.warn('Error pausing speechSynthesis:', e);
      }
    }
  }

  /**
   * Lanjutkan (Resume) pembacaan suara
   */
  public resume() {
    if (this.synth) {
      try {
        if (this.isPaused || this.synth.paused) {
          this.synth.resume();
          this.isPaused = false;
          this.notifyState();
        } else if (!this.synth.speaking && this.currentText) {
          this.processNextSpeech(this.currentText);
        } else if (!this.synth.speaking && this.queue.length > 0) {
          const next = this.queue.shift()!;
          this.processNextSpeech(next);
        }
      } catch (e) {
        console.warn('Error resuming speechSynthesis:', e);
      }
    }
  }

  /**
   * Stop pembacaan suara dan BERSIHKAN ANTREAN SUARA (Queue) sepenuhnya!
   */
  public stop() {
    this.queue = [];
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        console.warn('Error canceling speechSynthesis:', e);
      }
    }
    this.currentUtterance = null;
    this.currentText = null;
    this.isPaused = false;
    this.notifyState();
  }

  public onSpeechCompleted(listener: (text: string, wasSuccessful: boolean) => void): () => void {
    this.speechCompleteListeners.push(listener);
    return () => {
      this.speechCompleteListeners = this.speechCompleteListeners.filter((l) => l !== listener);
    };
  }

  private notifySpeechCompleted(text: string, wasSuccessful: boolean) {
    this.speechCompleteListeners.forEach((l) => {
      try {
        l(text, wasSuccessful);
      } catch (e) {
        console.warn('Speech complete listener error:', e);
      }
    });
  }

  public getState(): TTSState {
    const indonesianVoice = this.voices.find((v) => {
      const lang = (v.lang || '').toLowerCase();
      return lang.startsWith('id') || lang.includes('indonesia');
    });
    const activeVoice = this.getBestVoice();

    return {
      isSupported: this.isSupported(),
      isSpeaking: !!this.currentUtterance || (this.synth ? this.synth.speaking : false),
      isPaused: this.isPaused || (this.synth ? this.synth.paused : false),
      currentText: this.currentText,
      queue: [...this.queue],
      queueLength: this.queue.length,
      rate: this.rate,
      volume: this.volume,
      hasIndonesianVoice: !!indonesianVoice,
      selectedVoiceName: activeVoice ? `${activeVoice.name} (${activeVoice.lang})` : null,
      availableVoices: this.voices.map((v) => ({
        name: v.name,
        lang: v.lang,
        isIndonesian:
          v.lang.toLowerCase().startsWith('id') ||
          v.name.toLowerCase().includes('indonesia'),
      })),
    };
  }

  public subscribe(listener: (state: TTSState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyState() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }
}

export const ttsService = new TTSService();
