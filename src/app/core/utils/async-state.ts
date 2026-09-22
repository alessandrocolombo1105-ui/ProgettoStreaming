import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, startWith } from 'rxjs';

/** Esito di una richiesta, con i tre stati che la UI deve sapere distinguere. */
export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/**
 * Trasforma un Observable in un Signal che espone anche caricamento ed errore.
 *
 * Senza questo involucro ogni pagina ripeterebbe la stessa tripletta di signal
 * e lo stesso `catchError`; qui un errore diventa uno stato da mostrare invece
 * di un'eccezione che interrompe il flusso.
 *
 * Va invocata in un contesto di injection (inizializzatore di campo o
 * costruttore), come richiesto da `toSignal`.
 */
export function asyncState<T>(source$: Observable<T>, initial: T): Signal<AsyncState<T>> {
  return toSignal(
    source$.pipe(
      map((data): AsyncState<T> => ({ data, loading: false, error: null })),
      startWith({ data: initial, loading: true, error: null }),
      catchError((error: Error) =>
        of({ data: initial, loading: false, error: error.message ?? 'Errore imprevisto.' }),
      ),
    ),
    { initialValue: { data: initial, loading: true, error: null } },
  );
}
