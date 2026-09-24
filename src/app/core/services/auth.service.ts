import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { AuthError, AuthProvider, AuthSession, Credentials, SignUpData, User } from '../models';
import { GoogleAuthService, GoogleProfile } from './google-auth.service';

interface StoredAccount {
  user: User;
  password: string;
}

export interface DemoAccount {
  email: string;
  name: string;

  color: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: 'giulia.ferrari@example.com', name: 'Giulia Ferrari', color: '#7C5CFF' },
  { email: 'marco.rossi@example.com', name: 'Marco Rossi', color: '#22D3EE' },
  { email: 'sara.conti@example.com', name: 'Sara Conti', color: '#F472B6' },
] as const;

const ACCOUNTS_KEY = 'xflix.accounts';
const SESSION_KEY = 'xflix.session';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const FAKE_LATENCY_MS = 450;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly google = inject(GoogleAuthService);
  private readonly session = signal<AuthSession | null>(this.restoreSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);

  readonly userInitials = computed(() => {
    const name = this.user()?.displayName ?? '';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join('') || '?'
    );
  });

  signIn({ email, password }: Credentials): Observable<AuthSession> {
    const normalized = email.trim().toLowerCase();
    const account = this.readAccounts().find((item) => item.user.email === normalized);

    if (!account || account.password !== password) {
      return this.fail('invalid-credentials', 'Email o password non corretti.');
    }

    return this.succeed(account.user);
  }

  signUp({ email, password, displayName }: SignUpData): Observable<AuthSession> {
    const normalized = email.trim().toLowerCase();

    if (!this.isValidEmail(normalized)) {
      return this.fail('invalid-email', "L'indirizzo email non è valido.");
    }
    if (password.length < 6) {
      return this.fail('weak-password', 'La password deve contenere almeno 6 caratteri.');
    }

    const accounts = this.readAccounts();
    if (accounts.some((item) => item.user.email === normalized)) {
      return this.fail('email-already-in-use', 'Esiste già un account con questa email.');
    }

    const user = this.buildUser(
      normalized,
      displayName.trim() || normalized.split('@')[0],
      'password',
    );
    this.writeAccounts([...accounts, { user, password }]);
    return this.succeed(user);
  }

  signInWithGoogleProfile(profile: GoogleProfile): Observable<AuthSession> {
    const normalized = profile.email.trim().toLowerCase();
    const accounts = this.readAccounts();
    const existing = accounts.find((item) => item.user.email === normalized);

    if (existing) {
      const user: User = {
        ...existing.user,
        displayName: profile.name || existing.user.displayName,
        avatarUrl: profile.picture ?? existing.user.avatarUrl,
        provider: 'google',
      };
      this.writeAccounts(
        accounts.map((item) => (item.user.email === normalized ? { ...item, user } : item)),
      );
      return this.succeed(user);
    }

    const user: User = {
      ...this.buildUser(normalized, profile.name, 'google'),
      avatarUrl: profile.picture,
    };
    this.writeAccounts([...accounts, { user, password: '' }]);
    return this.succeed(user);
  }

  signInWithDemoAccount(account: DemoAccount): Observable<AuthSession> {
    return this.signInWithGoogleProfile({
      sub: `demo-${account.email}`,
      email: account.email,
      name: account.name,
      picture: null,
    });
  }

  signOut(): void {
    this.session.set(null);
    this.removeItem(SESSION_KEY);

    this.google.disableAutoSelect();
  }

  private succeed(user: User): Observable<AuthSession> {
    const session: AuthSession = {
      user,
      accessToken: `mock.${this.randomId()}`,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    this.session.set(session);
    this.setItem(SESSION_KEY, session);
    return of(session).pipe(delay(FAKE_LATENCY_MS));
  }

  private fail(code: AuthError['code'], message: string): Observable<never> {
    return throwError((): AuthError => ({ code, message })).pipe(delay(FAKE_LATENCY_MS));
  }

  private buildUser(email: string, displayName: string, provider: AuthProvider): User {
    return {
      id: this.randomId(),
      email,
      displayName,
      avatarUrl: null,
      provider,
      createdAt: new Date().toISOString(),
    };
  }

  private restoreSession(): AuthSession | null {
    const session = this.getItem<AuthSession>(SESSION_KEY);
    if (!session?.user || session.expiresAt <= Date.now()) {
      this.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  }

  private readAccounts(): StoredAccount[] {
    return this.getItem<StoredAccount[]>(ACCOUNTS_KEY) ?? [];
  }

  private writeAccounts(accounts: StoredAccount[]): void {
    this.setItem(ACCOUNTS_KEY, accounts);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  private randomId(): string {
    return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  }

  private getItem<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private setItem(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  private removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}
