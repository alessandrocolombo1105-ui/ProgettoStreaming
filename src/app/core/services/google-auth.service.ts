import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Profilo estratto dall'ID token restituito da Google. */
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

/** Parte dell'SDK Google Identity Services effettivamente usata qui. */
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

/**
 * Integrazione con Google Identity Services.
 *
 * L'SDK viene caricato solo quando serve davvero — cioè quando l'utente apre
 * la pagina di accesso e un Client ID è configurato — invece di pesare su ogni
 * avvio dell'app.
 *
 * Limite noto: senza un backend la firma dell'ID token non può essere
 * verificata, quindi il profilo va trattato come attendibile solo quanto lo è
 * il browser. Per la produzione il token va inviato a un server che ne
 * controlli la firma contro le chiavi pubbliche di Google.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  /** `false` finché il Client ID resta il segnaposto in `environment.ts`. */
  readonly isConfigured =
    !!environment.google.clientId && !environment.google.clientId.startsWith('INSERISCI');

  private sdkPromise: Promise<GoogleIdentitySdk> | null = null;

  /**
   * Disegna il bottone ufficiale di Google dentro `container`.
   *
   * Il pulsante deve essere quello reso da Google: un bottone replicato a mano
   * non aprirebbe il flusso di consenso e violerebbe le linee guida del brand.
   */
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

  /** Impedisce il riaccesso automatico dopo un logout esplicito. */
  disableAutoSelect(): void {
    if (this.isConfigured && window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  }

  /** Inserisce lo script di Google una sola volta e attende che sia pronto. */
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

    // Un fallimento non deve impedire un nuovo tentativo al clic successivo.
    this.sdkPromise.catch(() => (this.sdkPromise = null));
    return this.sdkPromise;
  }

  /**
   * Estrae il profilo dal payload dell'ID token.
   *
   * È una decodifica, non una verifica: il payload è Base64URL, non cifrato.
   * Va bene per popolare l'interfaccia, mai per autorizzare un'operazione
   * sensibile lato server.
   */
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
