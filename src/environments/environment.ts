export const environment = {
  production: false,
  tmdb: {
    apiKey: '999302dd19e29d6f46fc4910e5ced3c3',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    language: 'it-IT',
    region: 'IT',
  },
  google: {
    clientId: 'INSERISCI_QUI_IL_TUO_GOOGLE_CLIENT_ID',
  },
} as const;
