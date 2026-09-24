import { Movie, TvShow, Video } from '../models';
import {
  formatRuntime,
  getMatchPercentage,
  getMediaTitle,
  getMediaYear,
  pickBestTrailer,
  resolveMediaType,
  toMyListItem,
} from './media.util';

const movie = {
  id: 1,
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

const show = {
  id: 2,
  name: 'Dark',
  original_name: 'Dark',
  first_air_date: '2017-12-01',
  overview: '',
  backdrop_path: null,
  poster_path: null,
  vote_average: 8.7,
  vote_count: 50,
  popularity: 9,
  original_language: 'de',
} satisfies TvShow;

describe('media.util', () => {
  it('legge il titolo da campi diversi per film e serie', () => {
    expect(getMediaTitle(movie)).toBe('Inception');
    expect(getMediaTitle(show)).toBe('Dark');
  });

  it('deduce il tipo di contenuto quando media_type non è presente', () => {
    expect(resolveMediaType(movie)).toBe('movie');
    expect(resolveMediaType(show)).toBe('tv');
  });

  it("estrae l'anno e restituisce null se la data manca", () => {
    expect(getMediaYear(movie)).toBe(2010);
    expect(getMediaYear({ ...movie, release_date: '' })).toBeNull();
  });

  it('formatta la durata in ore e minuti', () => {
    expect(formatRuntime(107)).toBe('1h 47min');
    expect(formatRuntime(52)).toBe('52min');
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(null)).toBeNull();
  });

  it('converte il voto in percentuale di gradimento', () => {
    expect(getMatchPercentage(8.4)).toBe(84);
  });

  describe('pickBestTrailer', () => {
    const video = (over: Partial<Video>): Video => ({
      id: 'x',
      key: 'k',
      name: 'v',
      site: 'YouTube',
      type: 'Trailer',
      official: true,
      iso_639_1: 'en',
      ...over,
    });

    it('preferisce un trailer ufficiale nella lingua richiesta', () => {
      const chosen = pickBestTrailer(
        [
          video({ key: 'en-trailer', iso_639_1: 'en' }),
          video({ key: 'it-trailer', iso_639_1: 'it' }),
        ],
        'it',
      );
      expect(chosen?.key).toBe('it-trailer');
    });

    it('preferisce un trailer a un teaser a parità di lingua', () => {
      const chosen = pickBestTrailer(
        [video({ key: 'teaser', type: 'Teaser' }), video({ key: 'trailer', type: 'Trailer' })],
        'en',
      );
      expect(chosen?.key).toBe('trailer');
    });

    it('scarta i video che non sono su YouTube', () => {
      expect(pickBestTrailer([video({ site: 'Vimeo' })])).toBeNull();
      expect(pickBestTrailer([])).toBeNull();
      expect(pickBestTrailer(undefined)).toBeNull();
    });

    it('ripiega su un video di altra tipologia se non ci sono trailer', () => {
      const chosen = pickBestTrailer([video({ key: 'clip', type: 'Clip' })], 'it');
      expect(chosen?.key).toBe('clip');
    });
  });

  it('riduce un contenuto alla forma salvata nella lista', () => {
    const entry = toMyListItem(show);
    expect(entry.id).toBe(2);
    expect(entry.mediaType).toBe('tv');
    expect(entry.title).toBe('Dark');
    expect(entry.year).toBe(2017);
    expect(entry.addedAt).toBeTruthy();
  });
});
