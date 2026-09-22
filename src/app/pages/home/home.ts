import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MediaItem } from '../../core/models';
import { TmdbService } from '../../core/services/tmdb.service';
import { asyncState } from '../../core/utils/async-state';
import { HeroBanner } from '../../shared/components/hero-banner/hero-banner';
import { MovieRow } from '../../shared/components/movie-row/movie-row';

/** Generi TMDB usati per le righe tematiche della home. */
const GENRE_ACTION = 28;
const GENRE_COMEDY = 35;
const GENRE_HORROR = 27;

/**
 * Pagina principale: banner in evidenza seguito dai caroselli.
 *
 * Ogni riga ha il proprio stato di caricamento e le richieste partono in
 * parallelo: una sezione lenta o in errore non blocca le altre.
 */
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

  /**
   * Titolo del banner: il primo dei trending che abbia backdrop e descrizione.
   * Senza immagine il banner resterebbe un rettangolo grigio a tutto schermo.
   */
  protected readonly featured = computed<MediaItem | null>(() => {
    const items = this.trending().data;
    return items.find((item) => !!item.backdrop_path && !!item.overview) ?? items[0] ?? null;
  });

  protected readonly heroLoading = computed(() => this.trending().loading);
}
