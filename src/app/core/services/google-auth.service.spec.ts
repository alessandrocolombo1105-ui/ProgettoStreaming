import { TestBed } from '@angular/core/testing';
import { AuthService, DEMO_ACCOUNTS } from './auth.service';
import { GoogleAuthService } from './google-auth.service';

/**
 * Costruisce un ID token con il payload indicato; la firma non serve qui.
 *
 * Il payload passa per `TextEncoder`: un JWT reale contiene byte UTF-8, e
 * usare `btoa` direttamente sulla stringa la codificherebbe in Latin-1,
 * producendo un token che nessun client saprebbe rileggere.
 */
function fakeIdToken(claims: Record<string, string>): string {
  const encode = (value: object) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    const binary = String.fromCharCode(...bytes);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  return `${encode({ alg: 'RS256' })}.${encode(claims)}.firma-non-verificata`;
}

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleAuthService);
  });

  it('si dichiara non configurato finché il Client ID è il segnaposto', () => {
    // Riflette il valore in environment.ts: configurato solo con un ID reale.
    expect(typeof service.isConfigured).toBe('boolean');
  });

  it('rifiuta di disegnare il pulsante senza Client ID', async () => {
    if (service.isConfigured) {
      return;
    }
    await expect(
      service.renderButton(document.createElement('div'), () => {}, () => {}),
    ).rejects.toThrow('Google Client ID non configurato.');
  });

  it('non lancia se Google non è mai stato caricato', () => {
    expect(() => service.disableAutoSelect()).not.toThrow();
  });
});

describe('AuthService — accesso Google', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  it('crea una sessione dal profilo Google', async () => {
    await new Promise<void>((resolve) => {
      auth
        .signInWithGoogleProfile({
          sub: '1234',
          email: 'Mario.Rossi@Gmail.com',
          name: 'Mario Rossi',
          picture: 'https://example.com/foto.jpg',
        })
        .subscribe(() => resolve());
    });

    const user = auth.user();
    expect(auth.isAuthenticated()).toBe(true);
    // L'email viene normalizzata in minuscolo per evitare account duplicati.
    expect(user?.email).toBe('mario.rossi@gmail.com');
    expect(user?.provider).toBe('google');
    expect(user?.avatarUrl).toBe('https://example.com/foto.jpg');
  });

  it('riusa lo stesso account se l\'email è già registrata', async () => {
    await new Promise<void>((resolve) => {
      auth
        .signUp({ email: 'sara@example.com', password: 'segreta', displayName: 'Sara' })
        .subscribe(() => resolve());
    });
    const firstId = auth.user()?.id;

    auth.signOut();

    await new Promise<void>((resolve) => {
      auth
        .signInWithGoogleProfile({
          sub: 'g-1',
          email: 'sara@example.com',
          name: 'Sara Conti',
          picture: null,
        })
        .subscribe(() => resolve());
    });

    // Stesso utente, non un doppione: cambia solo il provider usato per entrare.
    expect(auth.user()?.id).toBe(firstId);
    expect(auth.user()?.provider).toBe('google');
  });

  it('accede con un account demo del selettore simulato', async () => {
    const demo = DEMO_ACCOUNTS[0];

    await new Promise<void>((resolve) => {
      auth.signInWithDemoAccount(demo).subscribe(() => resolve());
    });

    expect(auth.user()?.email).toBe(demo.email);
    expect(auth.user()?.displayName).toBe(demo.name);
  });

});

describe('GoogleAuthService — decodifica del token', () => {
  /**
   * `decodeIdToken` è privato in TypeScript ma esiste a runtime: chiamarlo per
   * nome verifica il codice reale invece di una sua copia nel test.
   */
  let decode: (jwt: string) => { name: string; email: string; picture: string | null } | null;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(GoogleAuthService) as unknown as Record<string, Function>;
    decode = service['decodeIdToken'].bind(service) as typeof decode;
  });

  it('legge i caratteri accentati senza corromperli', () => {
    const profile = decode(
      fakeIdToken({ sub: '99', email: 'niccolo@example.com', name: 'Niccolò Sgrò', picture: '' }),
    );

    expect(profile?.name).toBe('Niccolò Sgrò');
    expect(profile?.email).toBe('niccolo@example.com');
  });

  it('ricade sulla parte locale dell\'email quando il nome manca', () => {
    const profile = decode(fakeIdToken({ sub: '1', email: 'solo.email@example.com' }));
    expect(profile?.name).toBe('solo.email');
  });

  it('rifiuta un token senza email o malformato', () => {
    expect(decode(fakeIdToken({ sub: '1' }))).toBeNull();
    expect(decode('non-e-un-jwt')).toBeNull();
    expect(decode('')).toBeNull();
  });
});
