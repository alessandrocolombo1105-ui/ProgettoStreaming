import { TestBed } from '@angular/core/testing';
import { Movie } from '../models';
import { AuthService } from './auth.service';
import { MyListService } from './my-list.service';

const movie = {
  id: 27205,
  title: 'Inception',
  original_title: 'Inception',
  release_date: '2010-07-16',
  overview: '',
  backdrop_path: '/b.jpg',
  poster_path: '/p.jpg',
  vote_average: 8.4,
  vote_count: 100,
  popularity: 10,
  original_language: 'en',
} satisfies Movie;

describe('MyListService', () => {
  let service: MyListService;
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    service = TestBed.inject(MyListService);

    await new Promise<void>((resolve) => {
      auth
        .signUp({ email: 'test@example.com', password: 'segreta', displayName: 'Test' })
        .subscribe(() => resolve());
    });
    TestBed.tick();
  });

  afterEach(() => localStorage.clear());

  it('aggiunge e rimuove un titolo alternando lo stato', () => {
    expect(service.isInList(movie.id, 'movie')).toBe(false);

    expect(service.toggle(movie)).toBe(true);
    expect(service.isInList(movie.id, 'movie')).toBe(true);
    expect(service.count()).toBe(1);

    expect(service.toggle(movie)).toBe(false);
    expect(service.isInList(movie.id, 'movie')).toBe(false);
    expect(service.isEmpty()).toBe(true);
  });

  it('non duplica un titolo già presente', () => {
    service.add(movie);
    service.add(movie);
    expect(service.count()).toBe(1);
  });

  it('distingue film e serie con lo stesso id', () => {
    service.add(movie);
    // Gli id TMDB si ripetono fra i due cataloghi: la chiave include il tipo.
    expect(service.isInList(movie.id, 'tv')).toBe(false);
  });

  it('svuota la lista al logout e la ripristina al rientro', async () => {
    service.add(movie);
    expect(service.count()).toBe(1);

    auth.signOut();
    TestBed.tick();
    expect(service.count()).toBe(0);

    await new Promise<void>((resolve) => {
      auth.signIn({ email: 'test@example.com', password: 'segreta' }).subscribe(() => resolve());
    });
    TestBed.tick();

    expect(service.count()).toBe(1);
  });

  it('ignora le modifiche quando nessuno è autenticato', () => {
    auth.signOut();
    TestBed.tick();

    service.add(movie);
    expect(service.count()).toBe(0);
  });
});
