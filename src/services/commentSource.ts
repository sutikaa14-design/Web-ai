import {
  CommentCallback,
  CommentSource,
  CommentSourceId,
  ConnectionStatus,
  RawComment,
  StatusCallback,
} from '../types';

/**
 * 1. ManualCommentSource
 * Memungkinkan host atau operator memasukkan komentar pengujian secara manual dari form UI tablet.
 */
export class ManualCommentSource implements CommentSource {
  public readonly id: CommentSourceId = 'manual';
  public readonly name = 'Manual';
  private status: ConnectionStatus = 'connected';
  private commentListeners: CommentCallback[] = [];
  private statusListeners: StatusCallback[] = [];

  public start(): void {
    this.status = 'connected';
    this.notifyStatus();
  }

  public stop(): void {
    this.status = 'disconnected';
    this.notifyStatus();
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onComment(callback: CommentCallback): () => void {
    this.commentListeners.push(callback);
    return () => {
      this.commentListeners = this.commentListeners.filter((cb) => cb !== callback);
    };
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Menerima komentar dari UI form manual dan mendistribusikannya ke pipeline
   */
  public ingestComment(comment: RawComment): void {
    const enrichedComment: RawComment = {
      ...comment,
      source: 'manual',
    };
    this.commentListeners.forEach((cb) => cb(enrichedComment));
  }

  public reconnect(): void {
    this.status = 'reconnecting';
    this.notifyStatus();
    setTimeout(() => {
      this.status = 'connected';
      this.notifyStatus();
    }, 600);
  }

  private notifyStatus(): void {
    this.statusListeners.forEach((cb) => cb(this.status));
  }
}

/**
 * Daftar sampel komentar untuk SimulationCommentSource
 */
export const SIMULATED_COMMENTS_SAMPLE = [
  { username: 'andi', text: 'Kamu suka kopi?' },
  { username: 'sari', text: 'Bisa bikin pantun?' },
  { username: 'budi', text: 'Kok lucu banget 😂' },
  { username: 'rina', text: 'Menurut kamu malam ini hujan nggak?' },
  // Komentar pengujian filter
  { username: 'doni', text: '👍🔥' }, // Filter: emoji-only
  { username: 'andi', text: 'Kamu suka kopi?' }, // Filter: duplicate
];

/**
 * 2. SimulationCommentSource
 * Menghasilkan aliran komentar simulasi untuk menguji seluruh pipeline (Filter -> Queue -> AI -> Response -> TTS)
 * tanpa memerlukan koneksi eksternal.
 */
export class SimulationCommentSource implements CommentSource {
  public readonly id: CommentSourceId = 'simulation';
  public readonly name = 'Simulation';
  private status: ConnectionStatus = 'connected';
  private commentListeners: CommentCallback[] = [];
  private statusListeners: StatusCallback[] = [];
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private currentIndex = 0;

  public start(): void {
    this.status = 'connected';
    this.notifyStatus();
  }

  public stop(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.status = 'disconnected';
    this.notifyStatus();
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onComment(callback: CommentCallback): () => void {
    this.commentListeners.push(callback);
    return () => {
      this.commentListeners = this.commentListeners.filter((cb) => cb !== callback);
    };
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  public ingestComment(comment: RawComment): void {
    const enrichedComment: RawComment = {
      ...comment,
      source: 'simulation',
    };
    this.commentListeners.forEach((cb) => cb(enrichedComment));
  }

  /**
   * Menjalankan rentetan komentar simulasi secara berkala (1.6 detik per komentar)
   */
  public runSimulation(
    onStep?: (index: number, total: number, comment: RawComment) => void
  ): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.currentIndex = 0;
    this.status = 'connected';
    this.notifyStatus();

    const sampleList = SIMULATED_COMMENTS_SAMPLE;

    const emitNext = () => {
      if (this.currentIndex >= sampleList.length) {
        if (this.simulationInterval) {
          clearInterval(this.simulationInterval);
          this.simulationInterval = null;
        }
        return;
      }
      const item = sampleList[this.currentIndex];
      const raw: RawComment = {
        id: `sim-${Date.now()}-${this.currentIndex}`,
        username: item.username,
        text: item.text,
        timestamp: Date.now(),
        source: 'simulation',
      };
      this.commentListeners.forEach((cb) => cb(raw));
      onStep?.(this.currentIndex + 1, sampleList.length, raw);
      this.currentIndex++;
    };

    emitNext();
    this.simulationInterval = setInterval(emitNext, 1600);
  }

  public reconnect(): void {
    this.status = 'reconnecting';
    this.notifyStatus();
    setTimeout(() => {
      this.status = 'connected';
      this.notifyStatus();
    }, 600);
  }

  private notifyStatus(): void {
    this.statusListeners.forEach((cb) => cb(this.status));
  }
}

/**
 * Interface Provider Eksternal Resmi di Masa Mendatang.
 * Dirancang agar provider resmi dapat dicolokkan (plugged-in)
 * tanpa mengubah conversation, filtering, queue, atau TTS.
 */
export interface ExternalCommentProvider {
  readonly providerName: string;
  start(): Promise<void> | void;
  stop(): void;
  onComment(callback: CommentCallback): () => void;
  onStatusChange(callback: StatusCallback): () => void;
}

/**
 * 3. ExternalCommentSource
 * Abstraksi murni untuk integrasi eksternal resmi di masa mendatang.
 * PENTING:
 * - TIDAK terkoneksi ke TikTok
 * - TIDAK membuat endpoint / API TikTok palsu
 * - TIDAK melakukan scraping TikTok
 * - TIDAK menggunakan pustaka TikTok tidak resmi
 * - Status secara jujur: 'not_connected' ("Not connected")
 */
export class ExternalCommentSource implements CommentSource {
  public readonly id: CommentSourceId = 'external';
  public readonly name = 'External';
  private status: ConnectionStatus = 'not_connected';
  private commentListeners: CommentCallback[] = [];
  private statusListeners: StatusCallback[] = [];
  private currentProvider: ExternalCommentProvider | null = null;
  private providerUnsubComment: (() => void) | null = null;
  private providerUnsubStatus: (() => void) | null = null;

  public start(): void {
    if (this.currentProvider) {
      this.currentProvider.start();
    } else {
      this.status = 'not_connected';
      this.notifyStatus();
    }
  }

  public stop(): void {
    if (this.currentProvider) {
      this.currentProvider.stop();
    }
    this.status = 'not_connected';
    this.notifyStatus();
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onComment(callback: CommentCallback): () => void {
    this.commentListeners.push(callback);
    return () => {
      this.commentListeners = this.commentListeners.filter((cb) => cb !== callback);
    };
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  public ingestComment(comment: RawComment): void {
    if (this.status === 'not_connected') {
      console.info(
        '[ExternalCommentSource] Komentar diabaikan karena External Source belum terhubung (Not connected).'
      );
      return;
    }
    const enrichedComment: RawComment = {
      ...comment,
      source: 'external',
    };
    this.commentListeners.forEach((cb) => cb(enrichedComment));
  }

  /**
   * Pintu masuk untuk memasang provider eksternal resmi di masa mendatang
   */
  public setProvider(provider: ExternalCommentProvider | null): void {
    if (this.providerUnsubComment) this.providerUnsubComment();
    if (this.providerUnsubStatus) this.providerUnsubStatus();
    this.currentProvider = provider;
    if (provider) {
      this.providerUnsubComment = provider.onComment((comment) => {
        const enriched: RawComment = { ...comment, source: 'external' };
        this.commentListeners.forEach((cb) => cb(enriched));
      });
      this.providerUnsubStatus = provider.onStatusChange((newStatus) => {
        this.status = newStatus;
        this.notifyStatus();
      });
      provider.start();
    } else {
      this.status = 'not_connected';
      this.notifyStatus();
    }
  }

  public reconnect(): void {
    if (!this.currentProvider) {
      this.status = 'not_connected';
      this.notifyStatus();
      return;
    }
    this.status = 'reconnecting';
    this.notifyStatus();
  }

  private notifyStatus(): void {
    this.statusListeners.forEach((cb) => cb(this.status));
  }
}

/**
 * Pengelola Sumber Komentar Tunggal (Singleton Manager)
 * Mengelola peralihan antara Manual, Simulation, dan External
 */
export class CommentSourceManager {
  private manualSource = new ManualCommentSource();
  private simulationSource = new SimulationCommentSource();
  private externalSource = new ExternalCommentSource();
  private activeSource: CommentSource;
  private commentListeners: CommentCallback[] = [];
  private statusListeners: Array<(status: ConnectionStatus, sourceId: CommentSourceId) => void> = [];

  private currentUnsubComment: (() => void) | null = null;
  private currentUnsubStatus: (() => void) | null = null;

  constructor() {
    this.activeSource = this.manualSource;
    this.bindActiveSource();
  }

  public getManualSource(): ManualCommentSource {
    return this.manualSource;
  }

  public getSimulationSource(): SimulationCommentSource {
    return this.simulationSource;
  }

  public getExternalSource(): ExternalCommentSource {
    return this.externalSource;
  }

  public getActiveSource(): CommentSource {
    return this.activeSource;
  }

  public getActiveSourceId(): CommentSourceId {
    return this.activeSource.id;
  }

  public getStatus(): ConnectionStatus {
    return this.activeSource.getStatus();
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.getStatus();
  }

  public setSource(sourceId: CommentSourceId): CommentSource {
    if (sourceId === this.activeSource.id) return this.activeSource;

    this.activeSource.stop();

    if (sourceId === 'simulation') {
      this.activeSource = this.simulationSource;
    } else if (sourceId === 'external') {
      this.activeSource = this.externalSource;
    } else {
      this.activeSource = this.manualSource;
    }

    this.activeSource.start();
    this.bindActiveSource();
    return this.activeSource;
  }

  public reconnect(): void {
    if (this.activeSource.reconnect) {
      this.activeSource.reconnect();
    }
  }

  public ingest(comment: RawComment): void {
    if (this.activeSource.ingestComment) {
      this.activeSource.ingestComment(comment);
    } else {
      this.commentListeners.forEach((cb) => cb(comment));
    }
  }

  public subscribe(onComment: CommentCallback): () => void {
    this.commentListeners.push(onComment);
    return () => {
      this.commentListeners = this.commentListeners.filter((cb) => cb !== onComment);
    };
  }

  public onStatusChange(
    listener: (status: ConnectionStatus, sourceId: CommentSourceId) => void
  ): () => void {
    this.statusListeners.push(listener);
    listener(this.activeSource.getStatus(), this.activeSource.id);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private bindActiveSource(): void {
    if (this.currentUnsubComment) this.currentUnsubComment();
    if (this.currentUnsubStatus) this.currentUnsubStatus();

    this.currentUnsubComment = this.activeSource.onComment((comment) => {
      this.commentListeners.forEach((cb) => cb(comment));
    });

    this.currentUnsubStatus = this.activeSource.onStatusChange((status) => {
      this.statusListeners.forEach((cb) => cb(status, this.activeSource.id));
    });
  }
}

export const commentSourceManager = new CommentSourceManager();
