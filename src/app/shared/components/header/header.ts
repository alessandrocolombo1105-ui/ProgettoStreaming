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
import { TitlePart, rankByRelevance, splitOnMatch } from '../../../core/utils/search.util';
import { Icon } from '../icon/icon';

const MIN_QUERY_LENGTH = 3;

const SEARCH_DEBOUNCE_MS = 300;

const CAROUSEL_RESULTS = 20;

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

  private readonly search$ = this.searchControl.valueChanges.pipe(
    map((value) => value.trim()),
    debounceTime(SEARCH_DEBOUNCE_MS),
    distinctUntilChanged(),
    tap((term) => this.isSearching.set(term.length >= MIN_QUERY_LENGTH)),
    switchMap((term) => {
      if (term.length < MIN_QUERY_LENGTH) {
        return of({ term, items: [] as MediaItem[] });
      }
      return this.tmdb.search(term).pipe(
        map((items) => ({ term, items: rankByRelevance(items, term).slice(0, CAROUSEL_RESULTS) })),
        catchError(() => of({ term, items: [] as MediaItem[] })),
      );
    }),
    tap(() => this.isSearching.set(false)),
  );

  private readonly outcome = toSignal(this.search$, {
    initialValue: { term: '', items: [] as MediaItem[] },
  });

  protected readonly results = computed(() => this.outcome().items);

  protected readonly activeTerm = computed(() => this.outcome().term);

  protected readonly hasQuery = computed(() => this.searchControl.value.trim().length > 0);

  protected readonly showResults = computed(
    () => this.isSearchOpen() && this.searchControl.value.trim().length >= MIN_QUERY_LENGTH,
  );

  protected readonly skeletons = Array.from({ length: 8 }, (_, index) => index);

  protected toggleSearch(): void {
    const opening = !this.isSearchOpen();
    this.isSearchOpen.set(opening);

    if (opening) {
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
    } else {
      this.searchControl.setValue('');
    }
  }

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

  protected titleParts(item: MediaItem): TitlePart[] {
    return splitOnMatch(getMediaTitle(item), this.activeTerm());
  }

  protected posterUrl(item: MediaItem): string {
    return this.tmdb.posterUrl(item.poster_path, 'w185');
  }

  protected trackResult(item: MediaItem): string {
    return `${resolveMediaType(item)}:${item.id}`;
  }

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

  protected onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 60);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closeAll();
    }
  }
}
