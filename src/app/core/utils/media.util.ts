import {
  MediaDetails,
  MediaItem,
  MediaType,
  MovieDetails,
  MyListItem,
  TvDetails,
  Video,
  isMovie,
} from '../models';

/**
 * Funzioni che appianano la differenza fra film e serie: TMDB usa
 * `title`/`release_date` per i primi e `name`/`first_air_date` per le seconde,
 * distinzione che i componenti non devono conoscere.
 */

/** Titolo visualizzabile, indipendentemente dal tipo di contenuto. */
export function getMediaTitle(item: MediaItem | MediaDetails): string {
  return isMovie(item) ? item.title : item.name;
}

/** Data di uscita in formato `YYYY-MM-DD`, stringa vuota se assente. */
export function getMediaDate(item: MediaItem | MediaDetails): string {
  return isMovie(item) ? item.release_date : item.first_air_date;
}

/** Anno di uscita, `null` quando TMDB non fornisce una data valida. */
export function getMediaYear(item: MediaItem | MediaDetails): number | null {
  const year = Number.parseInt(getMediaDate(item)?.slice(0, 4) ?? '', 10);
  return Number.isFinite(year) ? year : null;
}

/**
 * Tipo del contenuto. `media_type` arriva solo dagli endpoint misti
 * (trending, search), quindi altrove va dedotto dalla forma dell'oggetto.
 */
export function resolveMediaType(item: MediaItem | MediaDetails): MediaType {
  return item.media_type ?? (isMovie(item) ? 'movie' : 'tv');
}

/** Voto su 10 con un decimale, oppure `null` se nessuno ha ancora votato. */
export function formatVote(voteAverage: number, voteCount = 1): string | null {
  if (!voteCount || voteAverage <= 0) {
    return null;
  }
  return voteAverage.toFixed(1);
}

/** Percentuale intera di gradimento, usata dal badge "match". */
export function getMatchPercentage(voteAverage: number): number {
  return Math.round(voteAverage * 10);
}

/** Converte minuti in `1h 47min`, `52min` o `null` se il dato manca. */
export function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) {
    return `${rest}min`;
  }
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

/** Durata sintetica: minuti per i film, numero di stagioni per le serie. */
export function getDurationLabel(details: MediaDetails): string | null {
  if (isMovie(details)) {
    return formatRuntime((details as MovieDetails).runtime);
  }
  const tv = details as TvDetails;
  if (!tv.number_of_seasons) {
    return null;
  }
  return tv.number_of_seasons === 1 ? '1 stagione' : `${tv.number_of_seasons} stagioni`;
}

/**
 * Sceglie il video da mostrare nella modale.
 *
 * TMDB restituisce i video in ordine arbitrario e mescola lingue e tipologie:
 * si preferisce un trailer ufficiale su YouTube nella lingua richiesta, con
 * fallback progressivi fino a un qualsiasi video YouTube riproducibile.
 */
export function pickBestTrailer(videos: Video[] | undefined, language = 'it'): Video | null {
  const playable = (videos ?? []).filter((video) => video.site === 'YouTube' && !!video.key);
  if (!playable.length) {
    return null;
  }

  const localeOf = (video: Video) => video.iso_639_1?.toLowerCase() ?? '';
  const preferred = language.slice(0, 2).toLowerCase();

  // Punteggio più basso = candidato migliore.
  const score = (video: Video): number => {
    const isTrailer = video.type === 'Trailer';
    const isTeaser = video.type === 'Teaser';
    const localeRank = localeOf(video) === preferred ? 0 : localeOf(video) === 'en' ? 1 : 2;
    const typeRank = isTrailer ? 0 : isTeaser ? 1 : 2;
    const officialRank = video.official ? 0 : 1;
    return localeRank * 100 + typeRank * 10 + officialRank;
  };

  return [...playable].sort((a, b) => score(a) - score(b))[0];
}

/** Riduce un contenuto TMDB alla forma salvata ne "La Mia Lista". */
export function toMyListItem(item: MediaItem | MediaDetails): MyListItem {
  return {
    id: item.id,
    mediaType: resolveMediaType(item),
    title: getMediaTitle(item),
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    voteAverage: item.vote_average,
    year: getMediaYear(item),
    addedAt: new Date().toISOString(),
  };
}

/** Chiave stabile per `@for` e per identificare una voce salvata. */
export function mediaKey(id: number, mediaType: MediaType): string {
  return `${mediaType}:${id}`;
}
