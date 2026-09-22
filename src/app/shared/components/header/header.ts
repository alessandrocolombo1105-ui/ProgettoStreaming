import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { MediaItem } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { DetailModalService } from '../../../core/services/detail-modal.service';
import { MyListService } from '../../../core/services/my-list.service';
import { TmdbService } from '../../../core/services/tmdb.service';
import { getMediaTitle, getMediaYear, resolveMediaType } from '../../../core/utils/media.util';
import { Icon } from '../icon/icon';

/** Sotto questa soglia la ricerca non parte: due lettere danno solo rumore. */
const MIN_QUERY_LENGTH = 2;
/** Pausa dopo l'ultima battitura prima di interrogare TMDB. */
const SEARCH_DEBOUNCE_MS = 300;
/** Risultati mostrati nel menu a tendina; il resto si vede nel catalogo. */
const QUICK_RESULTS = 7;

/**
 * Barra di navigazione fissa con ricerca in tempo reale.
 *
 * Il flusso di ricerca è interamente RxJS: `debounceTime` evita una chiamata
 * per ogni tasto premuto, `distinctUntilChanged` scarta le ripetizioni (ad
 * esempio dopo aver scritto e cancellato una lettera) e `switchMap` annulla la
 * richiesta precedente, così una risposta lenta non sovrascrive quella nuova.
 */
@Component({
  selector: 'app-header',
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive, Icon],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-scrolled]': 'isScrolled()',
    '(window:scroll)': 'onWindowScroll()',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeAll()',
  },
})
export class Header {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly tmdb = inject(TmdbService);
  private readonly router = inject(Router);
  private readonly modal = inject(DetailModalService);
  private readonly auth = inject(AuthService);
  private readonly myList = inject(MyListService);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly searchControl = new FormControl('', { nonNullable: true });

  protected readonly isScrolled = signal(false);
  protected readonly isSearchOpen = signal(false);
  protected readonly isProfileOpen = signal(false);
  protected readonly isMenuOpen = signal(false);
  protected readonly isSearching = signal(false);

  protected readonly user = this.auth.user;
  protected readonly initials = this.auth.userInitials;
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly listCount = this.myList.count;

  /** Risultati rapidi della ricerca, aggiornati mentre l'utente digita. */
  protected readonly results = toSignal(
    this.searchControl.valueChanges.pipe(
      map((value) => value.trim()),
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      tap((term) => this.isSearching.set(term.length >= MIN_QUERY_LENGTH)),
      switchMap((term) => {
        if (term.length < MIN_QUERY_LENGTH) {
          return of<MediaItem[]>([]);
        }
        return this.tmdb.search(term).pipe(
          map((items) => items.slice(0, QUICK_RESULTS)),
          // Un errore di rete non deve interrompere il flusso: senza questo
          // catch l'Observable si completerebbe e la ricerca smetterebbe di
          // rispondere per il resto della sessione.
          catchError(() => of<MediaItem[]>([])),
        );
      }),
      tap(() => this.isSearching.set(false)),
    ),
    { initialValue: [] as MediaItem[] },
  );

  protected readonly hasQuery = computed(() => this.searchControl.value.trim().length > 0);

  protected readonly showResults = computed(
    () => this.isSearchOpen() && this.searchControl.value.trim().length >= MIN_QUERY_LENGTH,
  );

  /* ----------------------------------------------------------------------
     Ricerca
     ---------------------------------------------------------------------- */

  protected toggleSearch(): void {
    const opening = !this.isSearchOpen();
    this.isSearchOpen.set(opening);

    if (opening) {
      // Il focus va dato dopo che l'input è stato reso visibile dal template.
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
    } else {
      this.searchControl.setValue('');
    }
  }

  /** Invio sulla barra: porta al catalogo completo con la query applicata. */
  protected submitSearch(event: Event): void {
    event.preventDefault();
    const term = this.searchControl.value.trim();
    if (!term) {
      return;
    }
    this.closeAll();
    this.router.navigate(['/catalogo'], { queryParams: { query: term } });
  }

  protected openResult(item: MediaItem): void {
    this.closeAll();
    this.modal.open(item);
  }

  protected clearSearch(): void {
    this.searchControl.setValue('');
    this.searchInput()?.nativeElement.focus();
  }

  protected resultLabel(item: MediaItem): string {
    const year = getMediaYear(item);
    const type = resolveMediaType(item) === 'movie' ? 'Film' : 'Serie TV';
    return year ? `${type} · ${year}` : type;
  }

  protected resultTitle(item: MediaItem): string {
    return getMediaTitle(item);
  }

  protected posterUrl(item: MediaItem): string {
    return this.tmdb.posterUrl(item.poster_path, 'w185');
  }

  protected trackResult(item: MediaItem): string {
    return `${resolveMediaType(item)}:${item.id}`;
  }

  /* ----------------------------------------------------------------------
     Menu
     ---------------------------------------------------------------------- */

  protected toggleProfile(): void {
    this.isProfileOpen.update((open) => !open);
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  protected signOut(): void {
    this.closeAll();
    this.auth.signOut();
    this.router.navigate(['/']);
  }

  protected closeAll(): void {
    this.isProfileOpen.set(false);
    this.isMenuOpen.set(false);
    this.isSearchOpen.set(false);
    this.searchControl.setValue('');
  }

  /* ----------------------------------------------------------------------
     Eventi globali
     ---------------------------------------------------------------------- */

  /** Oltre i 60px la barra diventa opaca per restare leggibile sui caroselli. */
  protected onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 60);
  }

  /** Un clic fuori dall'header chiude tendine e barra di ricerca. */
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closeAll();
    }
  }
}
