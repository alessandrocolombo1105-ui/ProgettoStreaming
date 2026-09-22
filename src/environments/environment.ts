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
    apiKey: 'INSERISCI_QUI_LA_TUA_TMDB_API_KEY',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    /** Lingua dei metadati restituiti da TMDB. */
    language: 'it-IT',
    /** Regione usata per date di uscita e disponibilità. */
    region: 'IT',
  },
} as const;
