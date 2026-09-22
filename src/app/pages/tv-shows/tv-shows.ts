import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MediaItem } from '../../core/models';
import { TmdbService } from '../../core/services/tmdb.service';
import { asyncState } from '../../core/utils/async-state';
import { HeroBanner } from '../../shared/components/hero-banner/hero-banner';
import { MovieRow } from '../../shared/components/movie-row/movie-row';

/**
 * Generi TMDB per le serie: gli id non coincidono con quelli dei film
 * (ad esempio "Azione & Avventura" esiste solo per le serie).
 */
const GENRES = {
  azioneAvventura: 10759,
  commedia: 35,
  dramma: 18,
  crime: 80,
  documentario: 99,
  animazione: 16,
} as const;

/** Sezione dedicata alle serie TV. */
@Component({
  selector: 'app-tv-shows',
  imports: [HeroBanner, MovieRow],
  templateUrl: './tv-shows.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvShows {
  private readonly tmdb = inject(TmdbService);

  protected readonly onTheAir = asyncState<MediaItem[]>(this.tmdb.getOnTheAirTv(), []);
  protected readonly popular = asyncState<MediaItem[]>(this.tmdb.getPopularTv(), []);
  protected readonly topRated = asyncState<MediaItem[]>(this.tmdb.getTopRatedTv(), []);
  protected readonly actionAdventure = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('tv', GENRES.azioneAvventura),
    [],
  );
  protected readonly comedy = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('tv', GENRES.commedia),
    [],
  );
  protected readonly drama = asyncState<MediaItem[]>(this.tmdb.getByGenre('tv', GENRES.dramma), []);
  protected readonly crime = asyncState<MediaItem[]>(this.tmdb.getByGenre('tv', GENRES.crime), []);
  protected readonly documentary = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('tv', GENRES.documentario),
    [],
  );
  protected readonly animation = asyncState<MediaItem[]>(
    this.tmdb.getByGenre('tv', GENRES.animazione),
    [],
  );

  /** Serie in evidenza: la prima in onda con backdrop e descrizione. */
  protected readonly featured = computed<MediaItem | null>(() => {
    const items = this.onTheAir().data;
    return items.find((item) => !!item.backdrop_path && !!item.overview) ?? items[0] ?? null;
  });

  protected readonly heroLoading = computed(() => this.onTheAir().loading);
}
