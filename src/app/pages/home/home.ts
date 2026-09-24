import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MediaItem } from '../../core/models';
import { TmdbService } from '../../core/services/tmdb.service';
import { asyncState } from '../../core/utils/async-state';
import { HeroBanner } from '../../shared/components/hero-banner/hero-banner';
import { MovieRow } from '../../shared/components/movie-row/movie-row';

const GENRE_ACTION = 28;
const GENRE_COMEDY = 35;
const GENRE_HORROR = 27;

@Component({
  selector: 'app-home',
  imports: [HeroBanner, MovieRow],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly tmdb = inject(TmdbService);

  protected readonly trending = asyncState<MediaItem[]>(this.tmdb.getTrending('day'), []);
  protected readonly popularMovies = asyncState<MediaItem[]>(this.tmdb.getPopularMovies(), []);
  protected readonly topRatedMovies = asyncState<MediaItem[]>(this.tmdb.getTopRatedMovies(), []);
  protected readonly upcoming = asyncState<MediaItem[]>(this.tmdb.getUpcomingMovies(), []);
  protected readonly popularTv = asyncState<MediaItem[]>(this.tmdb.getPopularTv(), []);
  protected readonly topRatedTv = asyncState<MediaItem[]>(this.tmdb.getTopRatedTv(), []);
  protected readonly action = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('movie', GENRE_ACTION),
    [],
  );
  protected readonly comedy = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('movie', GENRE_COMEDY),
    [],
  );
  protected readonly horror = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('movie', GENRE_HORROR),
    [],
  );

  protected readonly featured = computed<MediaItem | null>(() => {
    const items = this.trending().data;
    return items.find((item) => !!item.backdrop_path && !!item.overview) ?? items[0] ?? null;
  });

  protected readonly heroLoading = computed(() => this.trending().loading);
}
