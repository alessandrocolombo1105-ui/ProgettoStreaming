/**
 * Tipi che ricalcano le risposte di TMDB API v3.
 *
 * TMDB omette molti campi a seconda dell'endpoint (le liste restituiscono meno
 * dati del dettaglio) e usa `null` per i valori mancanti: i campi opzionali qui
 * sotto riflettono quel comportamento invece di nasconderlo dietro a `any`.
 */

/** Inviluppo paginato comune a liste, discover e ricerca. */
export interface TmdbResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/** Discriminante usato per distinguere film e serie in liste miste. */
export type MediaType = 'movie' | 'tv';

export interface Genre {
  id: number;
  name: string;
}

/** Campi condivisi da film e serie nelle risposte di lista. */
interface TmdbMediaBase {
  id: number;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  genre_ids?: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean;
  original_language: string;
}

export interface Movie extends TmdbMediaBase {
  media_type?: 'movie';
  title: string;
  original_title: string;
  /** Formato `YYYY-MM-DD`; TMDB restituisce stringa vuota se la data è ignota. */
  release_date: string;
  video?: boolean;
}

export interface TvShow extends TmdbMediaBase {
  media_type?: 'tv';
  name: string;
  original_name: string;
  /** Formato `YYYY-MM-DD`; TMDB restituisce stringa vuota se la data è ignota. */
  first_air_date: string;
  origin_country?: string[];
}

/**
 * `/trending/all` restituisce anche le persone: il tipo le include perché
 * vanno filtrate a valle, non perché siano mostrabili come schede.
 */
export interface PersonResult {
  id: number;
  media_type: 'person';
  name: string;
  profile_path: string | null;
}

export type TmdbSearchResult = Movie | TvShow | PersonResult;

/** Unione dei soli contenuti mostrabili come scheda. */
export type MediaItem = Movie | TvShow;

/* --------------------------------------------------------------------------
   Dettaglio
   -------------------------------------------------------------------------- */

export interface Video {
  id: string;
  key: string;
  name: string;
  site: 'YouTube' | 'Vimeo' | string;
  type: 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Behind the Scenes' | string;
  official: boolean;
  iso_639_1: string;
  published_at?: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

/**
 * Dettaglio richiesto con `append_to_response=videos,credits,similar`:
 * quei tre blocchi sono opzionali perché presenti solo con l'append.
 */
interface TmdbDetailsBase extends TmdbMediaBase {
  genres: Genre[];
  homepage: string | null;
  status: string;
  tagline: string | null;
  production_companies?: ProductionCompany[];
  videos?: { results: Video[] };
  credits?: Credits;
  similar?: TmdbResponse<MediaItem>;
}

export interface MovieDetails extends TmdbDetailsBase {
  media_type?: 'movie';
  title: string;
  original_title: string;
  release_date: string;
  /** Durata in minuti; `null` se TMDB non la conosce. */
  runtime: number | null;
  budget?: number;
  revenue?: number;
  imdb_id?: string | null;
}

export interface TvDetails extends TmdbDetailsBase {
  media_type?: 'tv';
  name: string;
  original_name: string;
  first_air_date: string;
  last_air_date?: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  /** Durata media di un episodio; l'array è vuoto per molte serie. */
  episode_run_time: number[];
  seasons?: Season[];
  in_production?: boolean;
}

export type MediaDetails = MovieDetails | TvDetails;

/* --------------------------------------------------------------------------
   Type guard
   -------------------------------------------------------------------------- */

/** Vero per i film: `title` è presente solo su `Movie`/`MovieDetails`. */
export function isMovie(item: MediaItem | MediaDetails): item is Movie | MovieDetails {
  return 'title' in item;
}

/** Vero per le serie: `name` senza `title` identifica `TvShow`/`TvDetails`. */
export function isTvShow(item: MediaItem | MediaDetails): item is TvShow | TvDetails {
  return 'name' in item && !('title' in item);
}

/** Scarta le persone dai risultati misti di ricerca e trending. */
export function isDisplayableMedia(item: TmdbSearchResult): item is MediaItem {
  return item.media_type !== 'person';
}
