import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CatalogFilters,
  Genre,
  MediaDetails,
  MediaItem,
  MediaType,
  MovieDetails,
  SortOption,
  TmdbResponse,
  TmdbSearchResult,
  TvDetails,
  isDisplayableMedia,
} from '../models';

export type PosterSize = 'w185' | 'w342' | 'w500' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';

const IMAGE_FALLBACK =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 342 513">
      <rect width="342" height="513" fill="#232323"/>
      <text x="171" y="265" fill="#666" font-family="sans-serif" font-size="22"
        text-anchor="middle">Nessuna immagine</text>
    </svg>`,
  );

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.tmdb.baseUrl;

  private readonly genreCache = new Map<MediaType, Observable<Genre[]>>();

  readonly isConfigured =
    !!environment.tmdb.apiKey && !environment.tmdb.apiKey.startsWith('INSERISCI');

  getTrending(window: 'day' | 'week' = 'day'): Observable<MediaItem[]> {
    return this.http
      .get<TmdbResponse<TmdbSearchResult>>(`${this.base}/trending/all/${window}`)
      .pipe(map((res) => res.results.filter(isDisplayableMedia)));
  }

  getPopularMovies(page = 1): Observable<MediaItem[]> {
    return this.list('/movie/popular', { page });
  }

  getTopRatedMovies(page = 1): Observable<MediaItem[]> {
    return this.list('/movie/top_rated', { page });
  }

  getUpcomingMovies(page = 1): Observable<MediaItem[]> {
    return this.list('/movie/upcoming', { page, region: environment.tmdb.region });
  }

  getNowPlayingMovies(page = 1): Observable<MediaItem[]> {
    return this.list('/movie/now_playing', { page, region: environment.tmdb.region });
  }

  getPopularTv(page = 1): Observable<MediaItem[]> {
    return this.list('/tv/popular', { page });
  }

  getTopRatedTv(page = 1): Observable<MediaItem[]> {
    return this.list('/tv/top_rated', { page });
  }

  getOnTheAirTv(page = 1): Observable<MediaItem[]> {
    return this.list('/tv/on_the_air', { page });
  }

  getByGenre(mediaType: MediaType, genreId: number, page = 1): Observable<MediaItem[]> {
    return this.list(`/discover/${mediaType}`, {
      page,
      with_genres: genreId,
      sort_by: 'popularity.desc',
      'vote_count.gte': 100,
    });
  }

  getSimilar(mediaType: MediaType, id: number): Observable<MediaItem[]> {
    return this.list(`/${mediaType}/${id}/similar`, {});
  }

  getDetails(mediaType: MediaType, id: number): Observable<MediaDetails> {
    const params = this.toParams({
      append_to_response: 'videos,credits,similar',
      include_video_language: `${environment.tmdb.language.slice(0, 2)},en,null`,
    });
    return this.http.get<MediaDetails>(`${this.base}/${mediaType}/${id}`, { params });
  }

  getMovieDetails(id: number): Observable<MovieDetails> {
    return this.getDetails('movie', id) as Observable<MovieDetails>;
  }

  getTvDetails(id: number): Observable<TvDetails> {
    return this.getDetails('tv', id) as Observable<TvDetails>;
  }

  search(query: string, page = 1): Observable<MediaItem[]> {
    const term = query.trim();
    if (!term) {
      return of([]);
    }
    return this.http
      .get<TmdbResponse<TmdbSearchResult>>(`${this.base}/search/multi`, {
        params: this.toParams({ query: term, page, include_adult: false }),
      })
      .pipe(map((res) => res.results.filter(isDisplayableMedia)));
  }

  getCatalog(filters: CatalogFilters): Observable<TmdbResponse<MediaItem>> {
    const term = filters.query.trim();

    if (term) {
      return this.http
        .get<TmdbResponse<TmdbSearchResult>>(`${this.base}/search/${filters.mediaType}`, {
          params: this.toParams({ query: term, page: filters.page, include_adult: false }),
        })
        .pipe(
          map((res) => ({
            ...res,
            results: res.results.filter(isDisplayableMedia).filter((item) => {
              const matchesGenre =
                filters.genreId === null || (item.genre_ids ?? []).includes(filters.genreId);
              const matchesRating = item.vote_average >= filters.minRating;
              return matchesGenre && matchesRating;
            }),
          })),
        );
    }

    const params: Record<string, string | number | boolean> = {
      page: filters.page,
      sort_by: this.resolveSort(filters.sortBy, filters.mediaType),
      include_adult: false,
      'vote_count.gte': filters.sortBy === 'vote_average.desc' ? 300 : 50,
    };

    if (filters.genreId !== null) {
      params['with_genres'] = filters.genreId;
    }
    if (filters.minRating > 0) {
      params['vote_average.gte'] = filters.minRating;
    }
    if (filters.year !== null) {
      params[filters.mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year'] =
        filters.year;
    }

    return this.http.get<TmdbResponse<MediaItem>>(`${this.base}/discover/${filters.mediaType}`, {
      params: this.toParams(params),
    });
  }

  getGenres(mediaType: MediaType): Observable<Genre[]> {
    const cached = this.genreCache.get(mediaType);
    if (cached) {
      return cached;
    }

    const request = this.http.get<{ genres: Genre[] }>(`${this.base}/genre/${mediaType}/list`).pipe(
      map((res) => res.genres),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.genreCache.set(mediaType, request);
    return request;
  }

  posterUrl(path: string | null | undefined, size: PosterSize = 'w342'): string {
    return path ? `${environment.tmdb.imageBaseUrl}/${size}${path}` : IMAGE_FALLBACK;
  }

  backdropUrl(path: string | null | undefined, size: BackdropSize = 'w780'): string {
    return path ? `${environment.tmdb.imageBaseUrl}/${size}${path}` : IMAGE_FALLBACK;
  }

  private list(path: string, params: Record<string, string | number | boolean>) {
    return this.http
      .get<TmdbResponse<MediaItem>>(`${this.base}${path}`, { params: this.toParams(params) })
      .pipe(map((res) => res.results));
  }

  private resolveSort(sortBy: SortOption, mediaType: MediaType): string {
    if (mediaType === 'movie') {
      return sortBy;
    }
    switch (sortBy) {
      case 'primary_release_date.desc':
        return 'first_air_date.desc';
      case 'title.asc':
        return 'name.asc';
      case 'revenue.desc':
        return 'popularity.desc';
      default:
        return sortBy;
    }
  }

  private toParams(source: Record<string, string | number | boolean>): HttpParams {
    return Object.entries(source).reduce(
      (params, [key, value]) => params.set(key, String(value)),
      new HttpParams(),
    );
  }
}
