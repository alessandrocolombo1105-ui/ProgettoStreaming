import { MediaType } from './tmdb.model';

export type AuthProvider = 'password' | 'google';

export interface User {
  id: string;
  email: string;
  displayName: string;

  avatarUrl: string | null;
  provider: AuthProvider;

  createdAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;

  expiresAt: number;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpData extends Credentials {
  displayName: string;
}

export interface MyListItem {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;

  year: number | null;

  addedAt: string;
}

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
