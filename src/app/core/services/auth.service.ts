import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { AuthError, AuthProvider, AuthSession, Credentials, SignUpData, User } from '../models';

/** Record salvato dal mock: l'utente più la password, che non esce mai di qui. */
interface StoredAccount {
  user: User;
  password: string;
}

const ACCOUNTS_KEY = 'xflix.accounts';
const SESSION_KEY = 'xflix.session';
/** Durata della sessione simulata: 7 giorni. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Latenza artificiale, per vedere gli stati di caricamento della UI. */
const FAKE_LATENCY_MS = 450;

/**
 * Autenticazione simulata su `localStorage`.
 *
 * La superficie pubblica (Observable in ingresso, Signal in uscita) è pensata
 * per restare invariata passando a Supabase o Firebase: cambierebbe solo il
 * corpo dei metodi, non i componenti che li usano.
 *
 * Nota: le password sono conservate in chiaro nel browser. È accettabile per un
 * mock di sviluppo e va sostituito da un backend reale prima della produzione.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<AuthSession | null>(this.restoreSession());

  /** Utente corrente, `null` se non autenticato. */
  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);

  /** Iniziali mostrate nell'avatar quando manca l'immagine del profilo. */
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

  /* ----------------------------------------------------------------------
     Operazioni
     ---------------------------------------------------------------------- */

  signIn({ email, password }: Credentials): Observable<AuthSession> {
    const normalized = email.trim().toLowerCase();
    const account = this.readAccounts().find((item) => item.user.email === normalized);

    if (!account || account.password !== password) {
      // Messaggio unico per utente inesistente e password errata: distinguerli
      // rivelerebbe quali indirizzi sono registrati.
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

    const user = this.buildUser(normalized, displayName.trim() || normalized.split('@')[0], 'password');
    this.writeAccounts([...accounts, { user, password }]);
    return this.succeed(user);
  }

  /**
   * Finto OAuth Google: salta la richiesta di password e riusa l'account
   * esistente se l'email è già registrata, come farebbe un provider reale.
   */
  signInWithGoogle(email = 'utente.demo@gmail.com'): Observable<AuthSession> {
    const normalized = email.trim().toLowerCase();
    const accounts = this.readAccounts();
    const existing = accounts.find((item) => item.user.email === normalized);

    if (existing) {
      return this.succeed(existing.user);
    }

    const user = this.buildUser(normalized, 'Utente Demo', 'google');
    this.writeAccounts([...accounts, { user, password: '' }]);
    return this.succeed(user);
  }

  signOut(): void {
    this.session.set(null);
    this.removeItem(SESSION_KEY);
  }

  /* ----------------------------------------------------------------------
     Interni
     ---------------------------------------------------------------------- */

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

  /** Ripristina la sessione salvata, scartandola se scaduta o corrotta. */
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

  /*
   * `localStorage` può lanciare in navigazione privata o con i cookie di terze
   * parti bloccati: ogni accesso è protetto per non impedire l'uso dell'app.
   */
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
    } catch {
      /* Storage non disponibile: la sessione resta valida solo in memoria. */
    }
  }

  private removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Nulla da fare: lo storage non è accessibile. */
    }
  }
}
