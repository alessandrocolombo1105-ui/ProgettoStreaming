/**
 * Configurazione applicativa.
 *
 * La chiave TMDB va inserita qui prima di avviare l'app: registrati su
 * https://www.themoviedb.org/settings/api e copia la "API Key (v3 auth)".
 */
export const environment = {
  production: false,

  tmdb: {
    /** API Key v3 di TMDB. Senza questo valore l'app mostra un banner di configurazione. */
    apiKey: '999302dd19e29d6f46fc4910e5ced3c3',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    /** Lingua dei metadati restituiti da TMDB. */
    language: 'it-IT',
    /** Regione usata per date di uscita e disponibilità. */
    region: 'IT',
  },

  google: {
    /**
     * OAuth Client ID per "Accedi con Google" (gratuito).
     *
     * Come ottenerlo, in 5 minuti:
     *  1. https://console.cloud.google.com/ → crea un progetto
     *  2. "API e servizi" → "Schermata consenso OAuth" → tipo "Esterno", compila
     *     nome app ed email, salva
     *  3. "Credenziali" → "Crea credenziali" → "ID client OAuth" →
     *     tipo "Applicazione web"
     *  4. In "Origini JavaScript autorizzate" aggiungi: http://localhost:4200
     *  5. Copia l'ID (finisce con .apps.googleusercontent.com) e incollalo qui
     *
     * Finché resta il segnaposto, l'app usa un selettore di account simulato,
     * dichiarato come tale nell'interfaccia.
     */
    clientId: 'INSERISCI_QUI_IL_TUO_GOOGLE_CLIENT_ID',
  },
} as const;
