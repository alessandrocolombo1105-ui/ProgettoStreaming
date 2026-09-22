import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MediaItem } from '../../core/models';
import { TmdbService } from '../../core/services/tmdb.service';
import { asyncState } from '../../core/utils/async-state';
import { HeroBanner } from '../../shared/components/hero-banner/hero-banner';
import { MovieRow } from '../../shared/components/movie-row/movie-row';

/** Generi TMDB delle righe tematiche di questa pagina. */
const GENRES = {
  azione: 28,
  avventura: 12,
  animazione: 16,
  fantascienza: 878,
  thriller: 53,
  romantico: 10749,
} as const;

/** Sezione dedicata ai soli film, con banner e caroselli per genere. */
@Component({
  selector: 'app-movies',
  imports: [HeroBanner, MovieRow],
  templateUrl: './movies.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Movies {
  private readonly tmdb = inject(TmdbService);

  protected readonly nowPlaying = asyncState<MediaItem[]>(this.tmdb.getNowPlayingMovies(), []);
  protected readonly popular = asyncState<MediaItem[]>(this.tmdb.getPopularMovies(), []);
  protected readonly topRated = asyncState<MediaItem[]>(this.tmdb.getTopRatedMovies(), []);
  protected readonly upcoming = asyncState<MediaItem[]>(this.tmdb.getUpcomingMovies(), []);
  protected readonly action = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('movie', GENRES.azione),
    [],
  );
  protected readonly adventure = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('movie', GENRES.avventura),
    [],
  );
  protected readonly animation = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('movie', GENRES.animazione),
    [],
  );
  protected readonly sciFi = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('movie', GENRES.fantascienza),
    [],
  );
  protected readonly thriller = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('movie', GENRES.thriller),
    [],
  );
  protected readonly romance = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('movie', GENRES.romantico),
    [],
  );

  /** Film in evidenza: il primo fra quelli al cinema con un backdrop usabile. */
  protected readonly featured = computed<MediaItem | null>(() => {
    const items = this.nowPlaying().data;
    return items.find((item) => !!item.backdrop_path && !!item.overview) ?? items[0] ?? null;
  });

  protected readonly heroLoading = computed(() => this.nowPlaying().loading);
}
