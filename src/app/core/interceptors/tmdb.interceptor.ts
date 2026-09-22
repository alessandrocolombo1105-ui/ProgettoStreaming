import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Messaggi di errore per i codici che TMDB restituisce più di frequente. */
function describeTmdbError(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Impossibile raggiungere TMDB: controlla la connessione di rete.';
  }
  switch (error.status) {
    case 401:
      return 'Chiave API TMDB non valida. Aggiorna `src/environments/environment.ts`.';
    case 404:
      return 'Contenuto non trovato su TMDB.';
    case 429:
      return 'Troppe richieste a TMDB: riprova tra qualche istante.';
    default:
      return error.error?.status_message ?? 'Errore imprevisto durante il caricamento dei dati.';
  }
}

/**
 * Aggiunge chiave API e lingua a ogni chiamata verso TMDB e normalizza gli
 * errori in `Error` con messaggio già leggibile, così i componenti non devono
 * interpretare gli status HTTP.
 *
 * I parametri già presenti sulla richiesta vengono rispettati: un endpoint che
 * imposta esplicitamente `language` continua a vincere su quello di default.
 */
export const tmdbInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.tmdb.baseUrl)) {
    return next(req);
  }

  let params = req.params.set('api_key', environment.tmdb.apiKey);
  if (!params.has('language')) {
    params = params.set('language', environment.tmdb.language);
  }

  return next(req.clone({ params })).pipe(
    catchError((error: HttpErrorResponse) => throwError(() => new Error(describeTmdbError(error)))),
  );
};
