import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

interface GoogleIdentitySdk {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type?: 'standard' | 'icon';
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'small' | 'medium' | 'large';
          text?: 'signin_with' | 'continue_with';
          shape?: 'rectangular' | 'pill';
          logo_alignment?: 'left' | 'center';
          width?: number;
          locale?: string;
        },
      ): void;
      disableAutoSelect(): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentitySdk;
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  readonly isConfigured =
    !!environment.google.clientId && !environment.google.clientId.startsWith('INSERISCI');

  private sdkPromise: Promise<GoogleIdentitySdk> | null = null;

  async renderButton(
    container: HTMLElement,
    onCredential: (profile: GoogleProfile) => void,
    onError: (message: string) => void,
  ): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Google Client ID non configurato.');
    }

    const sdk = await this.loadSdk();

    sdk.accounts.id.initialize({
      client_id: environment.google.clientId,
      callback: ({ credential }) => {
        const profile = this.decodeIdToken(credential);
        if (profile) {
          onCredential(profile);
        } else {
          onError('Risposta di Google non valida. Riprova.');
        }
      },
      cancel_on_tap_outside: true,
    });

    sdk.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      locale: 'it',
    });
  }

  disableAutoSelect(): void {
    if (this.isConfigured && window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  }

  private loadSdk(): Promise<GoogleIdentitySdk> {
    if (this.sdkPromise) {
      return this.sdkPromise;
    }

    this.sdkPromise = new Promise<GoogleIdentitySdk>((resolve, reject) => {
      if (window.google) {
        resolve(window.google);
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
      const script = existing ?? document.createElement('script');

      const settle = () => {
        if (window.google) {
          resolve(window.google);
        } else {
          reject(new Error('SDK di Google caricato ma non disponibile.'));
        }
      };

      script.addEventListener('load', settle, { once: true });
      script.addEventListener(
        'error',
        () => reject(new Error('Impossibile contattare Google. Controlla la connessione.')),
        { once: true },
      );

      if (!existing) {
        script.src = GSI_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    });

    this.sdkPromise.catch(() => (this.sdkPromise = null));
    return this.sdkPromise;
  }

  private decodeIdToken(jwt: string): GoogleProfile | null {
    try {
      const payload = jwt.split('.')[1];
      if (!payload) {
        return null;
      }

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(''),
      );

      const claims = JSON.parse(json) as Record<string, string>;
      if (!claims['email'] || !claims['sub']) {
        return null;
      }

      return {
        sub: claims['sub'],
        email: claims['email'],
        name: claims['name'] || claims['email'].split('@')[0],
        picture: claims['picture'] ?? null,
      };
    } catch {
      return null;
    }
  }
}
