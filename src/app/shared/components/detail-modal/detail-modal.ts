import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { MediaDetails, MediaItem } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { DetailModalService } from '../../../core/services/detail-modal.service';
import { MyListService } from '../../../core/services/my-list.service';
import { TmdbService } from '../../../core/services/tmdb.service';
import {
  getDurationLabel,
  getMatchPercentage,
  getMediaTitle,
  getMediaYear,
  pickBestTrailer,
  resolveMediaType,
} from '../../../core/utils/media.util';
import { Icon } from '../icon/icon';
import { MovieCard } from '../movie-card/movie-card';

/** Stato del caricamento dei dettagli. */
type DetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; details: MediaDetails }
  | { status: 'error'; message: string };

/**
 * Le chiavi YouTube sono stringhe di 11 caratteri alfanumerici.
 * Validarle prima di costruire l'URL evita di passare al sanitizer un valore
 * arbitrario proveniente da una risposta di rete.
 */
const YOUTUBE_KEY_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

/**
 * Modale con scheda completa e player del trailer.
 *
 * È montata una sola volta in `App` e riceve il contenuto da
 * `DetailModalService`. Usa l'elemento nativo `<dialog>`: focus trap, chiusura
 * con Esc e inerzia del resto della pagina arrivano dal browser, senza doverle
 * reimplementare.
 */
@Component({
  selector: 'app-detail-modal',
  imports: [Icon, MovieCard, RouterLink],
  templateUrl: './detail-modal.html',
  styleUrl: './detail-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailModal {
  private readonly modal = inject(DetailModalService);
  private readonly tmdb = inject(TmdbService);
  private readonly myList = inject(MyListService);
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly target = this.modal.current;
  protected readonly isAuthenticated = this.auth.isAuthenticated;

  /** Vero quando l'utente ha chiesto esplicitamente di vedere il trailer. */
  protected readonly isPlaying = signal(false);

  /** Dettagli del titolo selezionato, ricaricati a ogni apertura. */
  private readonly state = toSignal(
    toObservable(this.target).pipe(
      switchMap((target) => {
        if (!target) {
          return of<DetailState>({ status: 'idle' });
        }
        return this.tmdb.getDetails(target.mediaType, target.id).pipe(
          map((details): DetailState => ({ status: 'ready', details })),
          startWith<DetailState>({ status: 'loading' }),
          catchError((error: Error) =>
            of<DetailState>({ status: 'error', message: error.message }),
          ),
        );
      }),
    ),
    { initialValue: { status: 'idle' } as DetailState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly errorMessage = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.message : null;
  });

  protected readonly details = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.details : null;
  });

  /** Titolo e locandina della scheda cliccata, mostrati durante il caricamento. */
  protected readonly preview = computed(() => this.target()?.preview ?? null);

  protected readonly title = computed(() => {
    const details = this.details();
    const preview = this.preview();
    return details ? getMediaTitle(details) : preview ? getMediaTitle(preview) : '';
  });

  protected readonly backdrop = computed(() => {
    const source = this.details() ?? this.preview();
    return this.tmdb.backdropUrl(source?.backdrop_path, 'w1280');
  });

  protected readonly year = computed(() => {
    const details = this.details();
    return details ? getMediaYear(details) : null;
  });

  protected readonly duration = computed(() => {
    const details = this.details();
    return details ? getDurationLabel(details) : null;
  });

  protected readonly match = computed(() => {
    const details = this.details();
    return details && details.vote_count > 0 ? getMatchPercentage(details.vote_average) : null;
  });

  protected readonly rating = computed(() => {
    const details = this.details();
    return details && details.vote_count > 0 ? details.vote_average.toFixed(1) : null;
  });

  protected readonly genres = computed(() => this.details()?.genres ?? []);

  /** Primi interpreti del cast, quanti ne stanno su una riga. */
  protected readonly cast = computed(() => this.details()?.credits?.cast?.slice(0, 8) ?? []);

  protected readonly similar = computed<MediaItem[]>(
    () => this.details()?.similar?.results?.slice(0, 12) ?? [],
  );

  protected readonly trailer = computed(() =>
    pickBestTrailer(this.details()?.videos?.results, 'it'),
  );

  protected readonly hasTrailer = computed(() => this.trailer() !== null);

  /**
   * URL dell'iframe YouTube.
   *
   * Angular blocca gli URL dinamici in `[src]` di un iframe: il bypass è
   * necessario, ma viene applicato solo a un indirizzo costruito qui a partire
   * da una chiave già validata, mai a una stringa ricevuta così com'è.
   */
  protected readonly trailerUrl = computed<SafeResourceUrl | null>(() => {
    const video = this.trailer();
    if (!video || !YOUTUBE_KEY_PATTERN.test(video.key)) {
      return null;
    }
    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      modestbranding: '1',
    });
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${video.key}?${params}`,
    );
  });

  protected readonly isSaved = computed(() => {
    const source = this.details() ?? this.preview();
    return source ? this.myList.isInList(source.id, resolveMediaType(source)) : false;
  });

  constructor() {
    // Apertura e chiusura del <dialog> seguono lo stato del servizio.
    effect(() => {
      const element = this.dialog()?.nativeElement;
      const target = this.target();
      if (!element) {
        return;
      }

      if (target && !element.open) {
        element.showModal();
        document.body.classList.add('nf-modal-open');
      } else if (!target && element.open) {
        element.close();
      }
    });

    // Il player parte da solo se l'apertura arriva da un pulsante "Riproduci".
    effect(() => {
      const target = this.target();
      this.isPlaying.set(target?.autoplay ?? false);
    });
  }

  protected play(): void {
    this.isPlaying.set(true);
  }

  protected close(): void {
    this.modal.close();
  }

  /** Invocato anche dalla chiusura nativa con Esc, oltre che dal bottone. */
  protected onDialogClose(): void {
    document.body.classList.remove('nf-modal-open');
    this.isPlaying.set(false);
    if (this.target()) {
      this.modal.close();
    }
  }

  /**
   * Il click arriva sull'elemento `<dialog>` solo quando cade sullo sfondo:
   * sul contenuto lo intercetta il pannello interno.
   */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) {
      this.close();
    }
  }

  protected toggleList(): void {
    const source = this.details() ?? this.preview();
    if (source && this.isAuthenticated()) {
      this.myList.toggle(source);
    }
  }

  protected profileUrl(path: string | null): string {
    return this.tmdb.posterUrl(path, 'w185');
  }
}
