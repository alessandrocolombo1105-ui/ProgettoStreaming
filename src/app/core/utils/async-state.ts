import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, startWith } from 'rxjs';

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

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
