import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
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

const OVERVIEW_MAX_CHARS = 280;

@Component({
  selector: 'app-hero-banner',
  imports: [Icon],
  templateUrl: './hero-banner.html',
  styleUrl: './hero-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroBanner {
  private readonly tmdb = inject(TmdbService);
  private readonly modal = inject(DetailModalService);
  private readonly myList = inject(MyListService);
  private readonly auth = inject(AuthService);
  private readonly genres = inject(GenreStore);

  readonly media = input<MediaItem | null>(null);
  readonly loading = input(false);

  protected readonly title = computed(() => {
    const item = this.media();
    return item ? getMediaTitle(item) : '';
  });

  protected readonly backdrop = computed(() =>
    this.tmdb.backdropUrl(this.media()?.backdrop_path, 'original'),
  );

  protected readonly year = computed(() => {
    const item = this.media();
    return item ? getMediaYear(item) : null;
  });

  protected readonly match = computed(() => {
    const item = this.media();
    return item && item.vote_count > 0 ? getMatchPercentage(item.vote_average) : null;
  });

  protected readonly rating = computed(() => {
    const item = this.media();
    return item && item.vote_count > 0 ? item.vote_average.toFixed(1) : null;
  });

  protected readonly genreNames = computed(() => {
    const item = this.media();
    return item ? this.genres.namesFor(item, 3) : [];
  });

  protected readonly typeLabel = computed(() => {
    const item = this.media();
    if (!item) {
      return '';
    }
    return resolveMediaType(item) === 'movie' ? 'Film' : 'Serie TV';
  });

  protected readonly overview = computed(() => {
    const text = this.media()?.overview?.trim() ?? '';
    if (text.length <= OVERVIEW_MAX_CHARS) {
      return text;
    }
    const cut = text.slice(0, OVERVIEW_MAX_CHARS);
    return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
  });

  protected readonly isSaved = computed(() => {
    const item = this.media();
    return item ? this.myList.isInList(item.id, resolveMediaType(item)) : false;
  });

  protected readonly isAuthenticated = this.auth.isAuthenticated;

  protected playTrailer(): void {
    const item = this.media();
    if (item) {
      this.modal.open(item, { autoplay: true });
    }
  }

  protected openDetails(): void {
    const item = this.media();
    if (item) {
      this.modal.open(item);
    }
  }

  protected toggleList(): void {
    const item = this.media();
    if (!item) {
      return;
    }
    if (!this.isAuthenticated()) {
      this.openDetails();
      return;
    }
    this.myList.toggle(item);
  }
}
