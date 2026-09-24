import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  startWith,
  switchMap,
} from 'rxjs';
import {
  CatalogFilters,
  DEFAULT_FILTERS,
  MediaItem,
  MediaType,
  SORT_CHOICES,
  SortOption,
} from '../../core/models';
import { GenreStore } from '../../core/services/genre-store.service';
import { TmdbService } from '../../core/services/tmdb.service';
import { resolveMediaType } from '../../core/utils/media.util';
import { Icon } from '../../shared/components/icon/icon';
import { MovieCard } from '../../shared/components/movie-card/movie-card';

const SEARCH_DEBOUNCE_MS = 300;

const FIRST_YEAR = 1950;

interface CatalogRequest {
  filters: CatalogFilters;
  append: boolean;
}

@Component({
  selector: 'app-catalog',
  imports: [ReactiveFormsModule, Icon, MovieCard],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog {
  private readonly tmdb = inject(TmdbService);
  private readonly genreStore = inject(GenreStore);

  readonly query = input('');

  readonly form = new FormGroup({
    query: new FormControl(DEFAULT_FILTERS.query, { nonNullable: true }),
    mediaType: new FormControl<MediaType>(DEFAULT_FILTERS.mediaType, { nonNullable: true }),
    genreId: new FormControl<number | null>(DEFAULT_FILTERS.genreId),
    year: new FormControl<number | null>(DEFAULT_FILTERS.year),
    minRating: new FormControl(DEFAULT_FILTERS.minRating, { nonNullable: true }),
    sortBy: new FormControl<SortOption>(DEFAULT_FILTERS.sortBy, { nonNullable: true }),
  });

  private readonly requests = new Subject<CatalogRequest>();

  protected readonly results = signal<MediaItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly totalResults = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly page = signal(1);

  protected readonly sortChoices = SORT_CHOICES;
  protected readonly years = Array.from(
    { length: new Date().getFullYear() - FIRST_YEAR + 1 },
    (_, index) => new Date().getFullYear() - index,
  );

  private readonly mediaType = toSignal(
    this.form.controls.mediaType.valueChanges.pipe(startWith(this.form.controls.mediaType.value)),
    { initialValue: DEFAULT_FILTERS.mediaType },
  );

  protected readonly genres = computed(() => this.genreStore.list(this.mediaType() ?? 'movie'));

  protected readonly hasResults = computed(() => this.results().length > 0);
  protected readonly canLoadMore = computed(() => this.page() < this.totalPages());

  protected readonly resultsLabel = computed(() => {
    const total = this.totalResults();
    if (!total) {
      return 'Nessun risultato';
    }
    return total === 1 ? '1 titolo trovato' : `${total.toLocaleString('it-IT')} titoli trovati`;
  });

  protected readonly hasActiveFilters = computed(() => {
    const value = this.formValue();
    return (
      !!value.query ||
      value.genreId !== null ||
      value.year !== null ||
      value.minRating > 0 ||
      value.sortBy !== DEFAULT_FILTERS.sortBy
    );
  });

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(
      map(() => this.currentFilters()),
      startWith(DEFAULT_FILTERS),
    ),
    { initialValue: DEFAULT_FILTERS },
  );

  protected readonly skeletons = Array.from({ length: 18 }, (_, index) => index);

  constructor() {
    effect(() => {
      const initial = this.query();
      if (initial && initial !== this.form.controls.query.value) {
        this.form.controls.query.setValue(initial);
      }
    });

    const query$ = this.form.controls.query.valueChanges.pipe(
      map((value) => value.trim()),
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
    );

    const controls = this.form.controls;
    const others$ = merge(
      controls.mediaType.valueChanges,
      controls.genreId.valueChanges,
      controls.year.valueChanges,
      controls.minRating.valueChanges,
      controls.sortBy.valueChanges,
    );

    controls.mediaType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      controls.genreId.setValue(null, { emitEvent: false });
    });

    merge(query$, others$)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.search());

    this.requests
      .pipe(
        switchMap((request) => {
          const isAppend = request.append;
          (isAppend ? this.loadingMore : this.loading).set(true);
          this.error.set(null);
          return this.tmdb
            .getCatalog(request.filters)
            .pipe(map((response) => ({ response, isAppend })));
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ({ response, isAppend }) => {
          this.results.update((current) =>
            isAppend ? [...current, ...response.results] : response.results,
          );
          this.totalResults.set(response.total_results);

          this.totalPages.set(Math.min(response.total_pages, 500));
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });

    this.search();
  }

  protected search(): void {
    this.page.set(1);
    this.requests.next({ filters: this.currentFilters(), append: false });
  }

  protected loadMore(): void {
    if (!this.canLoadMore() || this.loadingMore()) {
      return;
    }
    const next = this.page() + 1;
    this.page.set(next);
    this.requests.next({ filters: { ...this.currentFilters(), page: next }, append: true });
  }

  protected resetFilters(): void {
    this.form.reset(
      {
        query: '',
        mediaType: this.form.controls.mediaType.value,
        genreId: null,
        year: null,
        minRating: 0,
        sortBy: DEFAULT_FILTERS.sortBy,
      },
      { emitEvent: false },
    );

    this.form.updateValueAndValidity();
    this.search();
  }

  protected trackMedia(item: MediaItem): string {
    return `${resolveMediaType(item)}:${item.id}`;
  }

  private currentFilters(): CatalogFilters {
    const value = this.form.getRawValue();
    return {
      query: value.query.trim(),
      mediaType: value.mediaType,
      genreId: value.genreId === null ? null : Number(value.genreId),
      year: value.year === null ? null : Number(value.year),
      minRating: Number(value.minRating),
      sortBy: value.sortBy,
      page: this.page(),
    };
  }
}
