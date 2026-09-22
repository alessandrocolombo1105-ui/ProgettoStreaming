import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { DEFAULT_FILTERS } from '../models';
import { tmdbInterceptor } from '../interceptors/tmdb.interceptor';
import { TmdbService } from './tmdb.service';

describe('TmdbService', () => {
  let service: TmdbService;
  let httpMock: HttpTestingController;
  const base = environment.tmdb.baseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tmdbInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(TmdbService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it("allega chiave API e lingua a ogni richiesta", () => {
    service.getPopularMovies().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${base}/movie/popular`);
    expect(req.request.params.get('api_key')).toBe(environment.tmdb.apiKey);
    expect(req.request.params.get('language')).toBe(environment.tmdb.language);
    req.flush({ page: 1, results: [], total_pages: 0, total_results: 0 });
  });

  it('scarta le persone dai risultati misti di trending', () => {
    let received: unknown[] = [];
    service.getTrending().subscribe((items) => (received = items));

    httpMock.expectOne((r) => r.url === `${base}/trending/all/day`).flush({
      page: 1,
      total_pages: 1,
      total_results: 3,
      results: [
        { id: 1, media_type: 'movie', title: 'Film' },
        { id: 2, media_type: 'person', name: 'Attore' },
        { id: 3, media_type: 'tv', name: 'Serie' },
      ],
    });

    expect(received.length).toBe(2);
  });

  it('non contatta TMDB per una ricerca vuota', () => {
    let received: unknown[] | null = null;
    service.search('   ').subscribe((items) => (received = items));

    expect(received).toEqual([]);
    httpMock.expectNone(() => true);
  });

  it('traduce i campi di ordinamento per le serie TV', () => {
    service
      .getCatalog({ ...DEFAULT_FILTERS, mediaType: 'tv', sortBy: 'primary_release_date.desc' })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${base}/discover/tv`);
    // `primary_release_date` non esiste su /discover/tv: inviarlo darebbe 400.
    expect(req.request.params.get('sort_by')).toBe('first_air_date.desc');
    req.flush({ page: 1, results: [], total_pages: 0, total_results: 0 });
  });

  it('applica anno e genere come parametri di discover', () => {
    service
      .getCatalog({ ...DEFAULT_FILTERS, genreId: 28, year: 2020, minRating: 7 })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${base}/discover/movie`);
    expect(req.request.params.get('with_genres')).toBe('28');
    expect(req.request.params.get('primary_release_year')).toBe('2020');
    expect(req.request.params.get('vote_average.gte')).toBe('7');
    req.flush({ page: 1, results: [], total_pages: 0, total_results: 0 });
  });

  it('filtra lato client i risultati di ricerca, che discover non può filtrare', () => {
    let total = 0;
    service
      .getCatalog({ ...DEFAULT_FILTERS, query: 'matrix', minRating: 7 })
      .subscribe((res) => (total = res.results.length));

    httpMock.expectOne((r) => r.url === `${base}/search/movie`).flush({
      page: 1,
      total_pages: 1,
      total_results: 2,
      results: [
        { id: 1, title: 'Buono', vote_average: 8.1, genre_ids: [] },
        { id: 2, title: 'Scarso', vote_average: 4.2, genre_ids: [] },
      ],
    });

    expect(total).toBe(1);
  });

  it('riusa la stessa richiesta per i generi già scaricati', () => {
    service.getGenres('movie').subscribe();
    httpMock.expectOne((r) => r.url === `${base}/genre/movie/list`).flush({ genres: [] });

    service.getGenres('movie').subscribe();
    httpMock.expectNone((r) => r.url === `${base}/genre/movie/list`);
  });

  it('traduce un 401 in un messaggio sulla chiave mancante', () => {
    let message = '';
    service.getPopularMovies().subscribe({ error: (err: Error) => (message = err.message) });

    httpMock
      .expectOne((r) => r.url === `${base}/movie/popular`)
      .flush({ status_message: 'Invalid API key' }, { status: 401, statusText: 'Unauthorized' });

    expect(message).toContain('Chiave API TMDB non valida');
  });

  it('ripiega su un placeholder quando manca la locandina', () => {
    expect(service.posterUrl(null)).toContain('data:image/svg+xml');
    expect(service.posterUrl('/abc.jpg')).toBe(`${environment.tmdb.imageBaseUrl}/w342/abc.jpg`);
  });
});
