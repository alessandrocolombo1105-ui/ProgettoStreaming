import { Movie } from '../models';
import { rankByRelevance, splitOnMatch } from './search.util';

/** Film minimo: al ranking servono titolo, titolo originale e popolarità. */
function movie(title: string, popularity = 1, originalTitle = title): Movie {
  return {
    id: title.length * 1000 + popularity,
    title,
    original_title: originalTitle,
    release_date: '2020-01-01',
    overview: '',
    backdrop_path: null,
    poster_path: null,
    vote_average: 7,
    vote_count: 10,
    popularity,
    original_language: 'it',
  };
}

const titles = (items: { title?: string; name?: string }[]) => items.map((i) => i.title ?? i.name);

describe('rankByRelevance', () => {
  it('mette davanti i titoli che iniziano con il testo digitato', () => {
    const ranked = rankByRelevance(
      [movie('Lo Squalo', 90), movie('Star Wars', 80), movie('Starship Troopers', 10)],
      'sta',
    );

    // "Lo Squalo" contiene "s" ma non inizia con "sta": scende in fondo,
    // nonostante sia il più popolare dei tre.
    expect(titles(ranked)).toEqual(['Star Wars', 'Starship Troopers', 'Lo Squalo']);
  });

  it('a parità di aderenza usa la popolarità', () => {
    const ranked = rankByRelevance([movie('Matrix Reloaded', 5), movie('Matrix', 99)], 'mat');
    expect(titles(ranked)).toEqual(['Matrix', 'Matrix Reloaded']);
  });

  it('premia l\'inizio di una parola rispetto a una corrispondenza interna', () => {
    const ranked = rankByRelevance([movie('Trasguerra', 99), movie('Star: Guerre', 1)], 'guerre');
    expect(titles(ranked)).toEqual(['Star: Guerre', 'Trasguerra']);
  });

  it('ignora accenti e maiuscole', () => {
    const ranked = rankByRelevance([movie('Zorro', 99), movie('Amélie', 1)], 'AME');
    expect(titles(ranked)[0]).toBe('Amélie');
  });

  it('si affina man mano che il testo si allunga', () => {
    const pool = [movie('Il Padrino', 50), movie('Il Pianista', 40), movie('Il Piccolo Lord', 30)];

    expect(titles(rankByRelevance(pool, 'il p'))[0]).toBe('Il Padrino');
    // Con due lettere in più resta un solo candidato in testa alla fascia.
    expect(titles(rankByRelevance(pool, 'il pi'))[0]).toBe('Il Pianista');
    expect(titles(rankByRelevance(pool, 'il pic'))[0]).toBe('Il Piccolo Lord');
  });

  it('riconosce il titolo originale, non solo quello tradotto', () => {
    const ranked = rankByRelevance(
      [
        movie('La guerra dei mondi', 90),
        // È il titolo italiano di Star Wars: cercando "star w" deve risalire,
        // anche se il titolo tradotto non contiene quelle lettere.
        movie('Guerre stellari', 10, 'Star Wars'),
      ],
      'star w',
    );

    expect(titles(ranked)).toEqual(['Guerre stellari', 'La guerra dei mondi']);
  });

  it('restituisce la lista intatta senza testo di ricerca', () => {
    const pool = [movie('B'), movie('A')];
    expect(rankByRelevance(pool, '   ')).toEqual(pool);
  });

  it('non perde né duplica risultati', () => {
    const pool = [movie('Alfa'), movie('Beta'), movie('Gamma')];
    expect(rankByRelevance(pool, 'a')).toHaveLength(3);
  });
});

describe('splitOnMatch', () => {
  it('isola la porzione corrispondente', () => {
    expect(splitOnMatch('Star Wars', 'sta')).toEqual([
      { text: 'Sta', match: true },
      { text: 'r Wars', match: false },
    ]);
  });

  it('trova la corrispondenza anche a metà titolo', () => {
    expect(splitOnMatch('Lo Squalo', 'qua')).toEqual([
      { text: 'Lo S', match: false },
      { text: 'qua', match: true },
      { text: 'lo', match: false },
    ]);
  });

  it('evidenzia ignorando gli accenti, senza alterare il testo mostrato', () => {
    const parts = splitOnMatch('Amélie', 'amel');
    // Il segmento evidenziato conserva l'accento del titolo originale.
    expect(parts[0]).toEqual({ text: 'Amél', match: true });
    expect(parts.map((p) => p.text).join('')).toBe('Amélie');
  });

  it('lascia il titolo intero quando non c\'è corrispondenza', () => {
    expect(splitOnMatch('Matrix', 'zzz')).toEqual([{ text: 'Matrix', match: false }]);
    expect(splitOnMatch('Matrix', '')).toEqual([{ text: 'Matrix', match: false }]);
  });

  it('ricompone sempre il titolo di partenza', () => {
    for (const query of ['sta', 'r w', 'wars', 'x']) {
      const parts = splitOnMatch('Star Wars', query);
      expect(parts.map((p) => p.text).join('')).toBe('Star Wars');
    }
  });
});
