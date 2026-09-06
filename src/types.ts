export type PersonaType = 'ramah' | 'lucu' | 'santai' | 'profesional' | 'energik';

export interface PersonaDetails {
  id: PersonaType;
  label: string;
  emoji: string;
  tagline: string;
  description: string;
  color: string;
  bgLight: string;
  borderActive: string;
}

export interface LiveConfig {
  hostName: string;
  coHostName: string;
  persona: PersonaType;
  language: string; // 'id' (Indonesia)
  topic: string;
  isLive: boolean;
  startedAt: number | null;
  isAiPaused?: boolean;
  autoSpeakAnswers?: boolean; // AUTO RESPONSE: jika ON otomatis masuk TTS queue
  maxAnswersPerMinute: number; // Batas jawaban per menit (default 10)
  activeSourceId: CommentSourceId; // Ingestion Source mode: 'manual' | 'simulation' | 'external'
}

export type CommentSourceId = 'manual' | 'simulation' | 'external';

export type ResponseValidationStatus = 'idle' | 'valid' | 'retry' | 'failed' | 'fallback';

export interface ChatMessage {
  id: string;
  commentId?: string;
  timestamp: number;
  viewerName: string;
  comment: string;
  answer: string;
  isGenerating?: boolean;
  validationStatus?: ResponseValidationStatus;
  isFallback?: boolean;
  retryCount?: number;
}

/**
 * Kontrak standar penerimaan komentar (Comment Ingestion Layer)
 */
export interface RawComment {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  source?: string; // 'manual' | 'simulation' | 'external' | string
  simulateError?: boolean;
}

export type ConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'not_connected';

export type CommentStatus = 'waiting' | 'processing' | 'answered' | 'ignored' | 'failed';

export interface QueuedComment {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  status: CommentStatus;
  source: string; // 'manual' | 'simulation' | 'external'
  ignoreReason?: string;
  isQuestion?: boolean;
  isDirectInteraction?: boolean;
  priority: number; // 3 untuk pertanyaan & interaksi langsung, 1 untuk umum
  answer?: string;
  answeredAt?: number;
  processedAt?: number;
  error?: string;
  simulateError?: boolean;
  validationStatus?: ResponseValidationStatus;
  isFallback?: boolean;
  retryCount?: number;
}

export interface PipelineDebugInfo {
  originalComment: string;
  aiRequestCreated: boolean;
  aiResponseReceived: boolean;
  extractedText: string;
  validationResult: 'valid' | 'fallback' | 'failed' | 'idle';
  validationFailureReason?: string;
  timestamp: number;
  modelUsed?: string;
}

export type CommentCallback = (comment: RawComment) => void;
export type StatusCallback = (status: ConnectionStatus) => void;

/**
 * Clean CommentSource Interface
 */
export interface CommentSource {
  id: CommentSourceId;
  name: string;
  start(): void | Promise<void>;
  stop(): void;
  getStatus(): ConnectionStatus;
  onComment(callback: CommentCallback): () => void;
  onStatusChange(callback: StatusCallback): () => void;
  ingestComment?(comment: RawComment): void;
  reconnect?(): Promise<void> | void;
}

export type CommentSourceType = 'manual' | 'tiktok_live' | 'realtime';

export interface ViewerCommentPayload {
  id: string;
  viewerName: string;
  comment: string;
  timestamp: number;
  source: CommentSourceType;
  avatarUrl?: string;
}

export interface CommentSourceAdapter {
  id: CommentSourceType;
  name: string;
  description: string;
  isReady: boolean;
  subscribe: (onComment: (comment: ViewerCommentPayload) => void) => () => void;
  sendManualComment?: (comment: ViewerCommentPayload) => void;
}

export type ResponseVariation =
  | 'default'
  | 'regenerate'
  | 'shorter'
  | 'funnier'
  | 'pantun'
  | 'ask_back'
  | 'lucu'
  | 'ramah'
  | 'hype'
  | 'lanjut_ngobrol'
  | 'ajak_penonton'
  | 'tebak_tebakan';

export type E2ETestStage =
  | 'idle'
  | 'received'
  | 'filtered_or_accepted'
  | 'queued'
  | 'processing'
  | 'answered'
  | 'spoken';

export interface E2ETestCommentItem {
  id: string;
  order: number;
  username: string;
  text: string;
  stage: E2ETestStage;
  receivedAt?: number;
  isFiltered: boolean;
  filterReason?: string;
  queuedAt?: number;
  processingAt?: number;
  answeredAt?: number;
  answerText?: string;
  aiError?: string;
  spokenAt?: number;
  isSpoken: boolean;
}

export interface E2ETestSummary {
  commentsReceived: number;
  commentsAnswered: number;
  commentsIgnored: number;
  aiErrors: number;
  ttsCompleted: number;
  totalComments: number;
  isCompleted: boolean;
  durationMs: number;
}

/**
 * Multi-Role Authentication & Access Control
 * MASTER: Hanya 1 akun (mdqputra@gmail.com). Mengelola Owner.
 * OWNER: Dibuat oleh Master. Hanya status ACTIVE yang dapat menggunakan LiveMate AI.
 */
export type UserRole = 'master' | 'owner';
export type UserStatus = 'active' | 'inactive';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: number;
  lastLoginAt?: number;
  notes?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  token: string;
  loginAt: number;
}

