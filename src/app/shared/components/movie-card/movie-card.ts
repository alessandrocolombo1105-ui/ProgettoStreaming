import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MediaItem } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { DetailModalService } from '../../../core/services/detail-modal.service';
import { GenreStore } from '../../../core/services/genre-store.service';
import { MyListService } from '../../../core/services/my-list.service';
import { TmdbService } from '../../../core/services/tmdb.service';
import {
  getMatchPercentage,
  getMediaTitle,
  getMediaYear,
  resolveMediaType,
} from '../../../core/utils/media.util';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-movie-card',
  imports: [Icon],
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-poster]': 'posterLayout()',
    '[class.is-active]': 'isActive()',
    '(mouseenter)': 'activate()',
    '(mouseleave)': 'deactivate()',
    '(focusin)': 'activate()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class MovieCard {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly tmdb = inject(TmdbService);
  private readonly modal = inject(DetailModalService);
  private readonly myList = inject(MyListService);
  private readonly auth = inject(AuthService);
  private readonly genres = inject(GenreStore);

  readonly media = input.required<MediaItem>();

  readonly posterLayout = input(false);

  readonly interactive = input(true);

  protected readonly isActive = signal(false);

  protected readonly title = computed(() => getMediaTitle(this.media()));
  protected readonly year = computed(() => getMediaYear(this.media()));
  protected readonly mediaType = computed(() => resolveMediaType(this.media()));
  protected readonly genreNames = computed(() => this.genres.namesFor(this.media()));

  protected readonly imageUrl = computed(() =>
    this.posterLayout()
      ? this.tmdb.posterUrl(this.media().poster_path, 'w342')
      : this.tmdb.backdropUrl(this.media().backdrop_path, 'w300'),
  );

  protected readonly match = computed(() => {
    const item = this.media();
    return item.vote_count > 0 ? getMatchPercentage(item.vote_average) : null;
  });

  protected readonly typeLabel = computed(() =>
    this.mediaType() === 'movie' ? 'Film' : 'Serie TV',
  );

  protected readonly isSaved = computed(() =>
    this.myList.isInList(this.media().id, this.mediaType()),
  );

  protected readonly isAuthenticated = this.auth.isAuthenticated;

  protected activate(): void {
    if (this.interactive()) {
      this.isActive.set(true);
    }
  }

  protected deactivate(): void {
    this.isActive.set(false);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.nativeElement.contains(next)) {
      this.deactivate();
    }
  }

  protected openDetails(): void {
    this.modal.open(this.media());
  }

  protected playTrailer(): void {
    this.modal.open(this.media(), { autoplay: true });
  }

  protected toggleList(): void {
    if (!this.isAuthenticated()) {
      this.openDetails();
      return;
    }
    this.myList.toggle(this.media());
  }
}
