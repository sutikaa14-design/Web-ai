import { AuthSession, UserAccount, UserRole, UserStatus } from '../types';

export const MASTER_EMAIL = 'mdqputra@gmail.com';
const ACCOUNTS_STORAGE_KEY = 'livemate_auth_accounts_v1';
const SESSION_STORAGE_KEY = 'livemate_auth_session_v1';

/**
 * SHA-256 Password Hashing via Web Crypto API
 * Menghindari penyimpanan plain-text password tanpa memerlukan third-party secret.
 */
export async function hashPassword(password: string): Promise<string> {
  const normalized = password.trim();
  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

class AuthService {
  private accounts: UserAccount[] = [];
  private session: AuthSession | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (raw) {
        this.accounts = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse accounts from storage, re-initializing...', e);
      this.accounts = [];
    }

    // Pastikan akun Master selalu ada dan unik
    const masterIndex = this.accounts.findIndex(
      (acc) => acc.email.toLowerCase() === MASTER_EMAIL.toLowerCase()
    );

    if (masterIndex === -1) {
      // Buat akun Master default jika belum ada
      const masterPassHash = await hashPassword('master123');
      const masterAccount: UserAccount = {
        id: 'usr-master-001',
        email: MASTER_EMAIL,
        name: 'Master MDQ Putra',
        passwordHash: masterPassHash,
        role: 'master',
        status: 'active',
        createdAt: Date.now(),
        notes: 'Akun Master Tunggal (Protected)',
      };
      this.accounts.unshift(masterAccount);

      // Buat juga contoh Owner demo agar Master langsung melihat daftar & bisa ditest
      const demoOwnerPassHash = await hashPassword('owner123');
      const demoOwner: UserAccount = {
        id: 'usr-owner-demo-1',
        email: 'streamer@livemate.ai',
        name: 'Kak Rian (Streamer)',
        passwordHash: demoOwnerPassHash,
        role: 'owner',
        status: 'active',
        createdAt: Date.now(),
        notes: 'Akun Owner Demo untuk Live Stream Fashion & OOTD',
      };
      this.accounts.push(demoOwner);
      this.saveAccounts();
    } else {
      // Pastikan role dan status Master selalu terlindungi
      this.accounts[masterIndex].role = 'master';
      this.accounts[masterIndex].status = 'active';
      this.accounts[masterIndex].email = MASTER_EMAIL;
      this.saveAccounts();
    }

    // Bersihkan duplikat Master jika ada (Aturan: Hanya 1 akun Master)
    const masterCount = this.accounts.filter((a) => a.role === 'master').length;
    if (masterCount > 1) {
      this.accounts = this.accounts.filter(
        (a) => a.role !== 'master' || a.email.toLowerCase() === MASTER_EMAIL.toLowerCase()
      );
      this.saveAccounts();
    }

    // Pulihkan sesi tersimpan jika ada
    try {
      const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (rawSession) {
        const parsedSession: AuthSession = JSON.parse(rawSession);
        // Validasi apakah akun masih ada di database lokal
        const user = this.accounts.find((u) => u.id === parsedSession.userId);
        if (user) {
          // Jika owner telah dinonaktifkan oleh master saat sesi berlangsung, batalkan sesi
          if (user.role === 'owner' && user.status !== 'active') {
            console.warn('Session invalidated: Owner account is inactive');
            this.logout();
          } else {
            this.session = {
              ...parsedSession,
              name: user.name,
              status: user.status,
              role: user.role,
            };
          }
        } else {
          this.logout();
        }
      }
    } catch (e) {
      console.warn('Failed to parse active session', e);
      this.logout();
    }

    this.isInitialized = true;
  }

  private saveAccounts() {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.accounts));
    } catch (e) {
      console.error('Failed to persist accounts to storage', e);
    }
  }

  private saveSession(session: AuthSession | null) {
    try {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to persist session to storage', e);
    }
  }

  /**
   * Mengambil sesi aktif saat ini
   */
  public getSession(): AuthSession | null {
    // Sinkronisasi dengan status akun terkini
    if (this.session) {
      const user = this.accounts.find((u) => u.id === this.session!.userId);
      if (!user || (user.role === 'owner' && user.status !== 'active')) {
        this.logout();
        return null;
      }
      return this.session;
    }
    return null;
  }

  /**
   * Melakukan Login:
   * - Master (mdqputra@gmail.com) -> Masuk ke Master Dashboard
   * - Owner (Active) -> Masuk ke LiveMate AI
   * - Owner (Inactive) -> Ditolak masuk dengan pesan jelas
   */
  public async login(emailInput: string, passwordInput: string): Promise<AuthSession> {
    await this.init();

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!email || !password) {
      throw new Error('Email dan password wajib diisi');
    }

    const user = this.accounts.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      throw new Error('Email atau password tidak cocok');
    }

    const inputHash = await hashPassword(password);
    if (user.passwordHash !== inputHash) {
      throw new Error('Email atau password tidak cocok');
    }

    // Pengecekan status Owner
    if (user.role === 'owner' && user.status === 'inactive') {
      throw new Error(
        'Akun Owner ini sedang dinonaktifkan oleh Master. Silakan hubungi Master (mdqputra@gmail.com) untuk mengaktifkan akun Anda.'
      );
    }

    user.lastLoginAt = Date.now();
    this.saveAccounts();

    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      token: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      loginAt: Date.now(),
    };

    this.session = session;
    this.saveSession(session);
    return session;
  }

  /**
   * Mengakhiri sesi pengguna
   */
  public logout(): void {
    this.session = null;
    this.saveSession(null);
  }

  /**
   * MASTER MANAGEMENT APIs
   * Hanya akun Master yang memiliki hak memanggil fungsi-fungsi ini.
   */

  /**
   * Mengambil daftar seluruh Owner (hanya dapat diakses Master)
   */
  public getOwners(): UserAccount[] {
    return this.accounts
      .filter((u) => u.role === 'owner')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Mengambil informasi akun Master
   */
  public getMasterAccount(): UserAccount | undefined {
    return this.accounts.find((u) => u.role === 'master' || u.email.toLowerCase() === MASTER_EMAIL.toLowerCase());
  }

  /**
   * Menambahkan Owner Baru (Hanya oleh Master)
   * ATURAN KETAT:
   * - Tidak boleh membuat akun Master kedua
   * - Role otomatis dikunci menjadi 'owner'
   */
  public async createOwner(data: {
    name: string;
    email: string;
    password: string;
    status?: UserStatus;
    notes?: string;
  }): Promise<UserAccount> {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password.trim();

    if (!name) throw new Error('Nama Owner wajib diisi');
    if (!email) throw new Error('Email Owner wajib diisi');
    if (!email.includes('@') || !email.includes('.')) {
      throw new Error('Format email tidak valid');
    }
    if (!password || password.length < 4) {
      throw new Error('Password minimal 4 karakter');
    }

    // ATURAN KETAT: Tidak boleh membuat akun Master kedua
    if (email === MASTER_EMAIL.toLowerCase()) {
      throw new Error('Email ini milik Master. Tidak boleh membuat akun Master kedua.');
    }

    // Cek duplikasi email
    const existing = this.accounts.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      throw new Error(`Email "${email}" sudah digunakan oleh akun lain`);
    }

    const passwordHash = await hashPassword(password);
    const newOwner: UserAccount = {
      id: `usr-owner-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      email,
      passwordHash,
      role: 'owner', // Selalu 'owner', tidak pernah 'master'
      status: data.status || 'active',
      createdAt: Date.now(),
      notes: data.notes?.trim(),
    };

    this.accounts.push(newOwner);
    this.saveAccounts();
    return newOwner;
  }

  /**
   * Mengedit data Owner (Hanya oleh Master)
   */
  public async updateOwner(
    id: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      status?: UserStatus;
      notes?: string;
    }
  ): Promise<UserAccount> {
    const userIndex = this.accounts.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error('Akun Owner tidak ditemukan');
    }

    const target = this.accounts[userIndex];
    if (target.role === 'master' || target.email.toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      throw new Error('Akun Master tidak dapat dimodifikasi sebagai Owner');
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new Error('Nama tidak boleh kosong');
      target.name = name;
    }

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      if (!email.includes('@') || !email.includes('.')) {
        throw new Error('Format email tidak valid');
      }
      if (email === MASTER_EMAIL.toLowerCase()) {
        throw new Error('Tidak dapat mengubah email Owner menjadi email Master');
      }
      const duplicate = this.accounts.find(
        (u) => u.email.toLowerCase() === email && u.id !== id
      );
      if (duplicate) {
        throw new Error(`Email "${email}" sudah digunakan akun lain`);
      }
      target.email = email;
    }

    if (data.password && data.password.trim()) {
      if (data.password.trim().length < 4) {
        throw new Error('Password baru minimal 4 karakter');
      }
      target.passwordHash = await hashPassword(data.password.trim());
    }

    if (data.status !== undefined) {
      target.status = data.status;
      // Jika status diubah jadi inactive dan kebetulan sedang ada sesi aktif untuk user ini,
      // user akan otomatis dikeluarkan pada pengecekan sesi berikutnya
    }

    if (data.notes !== undefined) {
      target.notes = data.notes.trim();
    }

    this.saveAccounts();
    return target;
  }

  /**
   * Mengaktifkan / Menonaktifkan Owner dengan 1 klik (Hanya oleh Master)
   */
  public toggleOwnerStatus(id: string): UserAccount {
    const user = this.accounts.find((u) => u.id === id);
    if (!user) {
      throw new Error('Akun Owner tidak ditemukan');
    }
    if (user.role === 'master' || user.email.toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      throw new Error('Status akun Master tidak dapat dinonaktifkan');
    }

    user.status = user.status === 'active' ? 'inactive' : 'active';
    this.saveAccounts();

    // Jika user dinonaktifkan dan sedang aktif sesi, batalkan sesi
    if (user.status === 'inactive' && this.session?.userId === user.id) {
      this.logout();
    }

    return user;
  }

  /**
   * Menghapus Owner (Hanya oleh Master)
   * Master TIDAK PERNAH bisa dihapus.
   */
  public deleteOwner(id: string): void {
    const user = this.accounts.find((u) => u.id === id);
    if (!user) {
      throw new Error('Akun tidak ditemukan');
    }
    if (user.role === 'master' || user.email.toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      throw new Error('Akun Master terlindungi dan tidak dapat dihapus');
    }

    this.accounts = this.accounts.filter((u) => u.id !== id);
    this.saveAccounts();

    // Jika akun yang dihapus sedang login
    if (this.session?.userId === id) {
      this.logout();
    }
  }
}

export const authService = new AuthService();
