import { MediaType } from './tmdb.model';

/** Provider con cui l'utente ha effettuato l'accesso. */
export type AuthProvider = 'password' | 'google';

export interface User {
  id: string;
  email: string;
  displayName: string;
  /** URL dell'avatar, oppure `null` per ricadere sulle iniziali. */
  avatarUrl: string | null;
  provider: AuthProvider;
  /** ISO 8601. */
  createdAt: string;
}

/** Sessione emessa dal servizio di autenticazione. */
export interface AuthSession {
  user: User;
  accessToken: string;
  /** Epoch in millisecondi oltre il quale la sessione va considerata scaduta. */
  expiresAt: number;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpData extends Credentials {
  displayName: string;
}

/**
 * Voce de "La Mia Lista". Conserva i campi necessari a disegnare la scheda
 * senza dover richiamare TMDB per ogni titolo salvato.
 */
export interface MyListItem {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  /** Anno di uscita, `null` se TMDB non lo espone. */
  year: number | null;
  /** ISO 8601, usato per ordinare la lista dal più recente. */
  addedAt: string;
}

/** Errore applicativo dell'autenticazione, con messaggio già localizzato. */
export interface AuthError {
  code:
    | 'invalid-credentials'
    | 'email-already-in-use'
    | 'weak-password'
    | 'invalid-email'
    | 'user-not-found'
    | 'unknown';
  message: string;
}
