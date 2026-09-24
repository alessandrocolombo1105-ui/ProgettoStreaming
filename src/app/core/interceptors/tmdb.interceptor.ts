import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

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
