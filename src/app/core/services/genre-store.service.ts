import { Injectable, computed, inject, signal } from '@angular/core';
import { Genre, MediaItem, MediaType } from '../models';
import { resolveMediaType } from '../utils/media.util';
import { TmdbService } from './tmdb.service';

/**
 * Dizionario dei generi TMDB condiviso da tutta l'app.
 *
 * Le schede espongono solo `genre_ids`: senza una mappa centrale ogni carosello
 * dovrebbe risolvere i nomi per conto proprio, moltiplicando le richieste.
 * Qui l'elenco viene caricato una sola volta per tipo e letto come Signal.
 */
@Injectable({ providedIn: 'root' })
export class GenreStore {
  private readonly tmdb = inject(TmdbService);

  private readonly movieGenres = signal<Genre[]>([]);
  private readonly tvGenres = signal<Genre[]>([]);
  private readonly requested = new Set<MediaType>();

  readonly movies = this.movieGenres.asReadonly();
  readonly tv = this.tvGenres.asReadonly();

  private readonly byId = computed(() => {
    const map = new Map<string, string>();
    for (const genre of this.movieGenres()) {
      map.set(`movie:${genre.id}`, genre.name);
    }
    for (const genre of this.tvGenres()) {
      map.set(`tv:${genre.id}`, genre.name);
    }
    return map;
  });

  constructor() {
    this.load('movie');
    this.load('tv');
  }

  /** Generi disponibili per il tipo indicato, ordinati alfabeticamente. */
  list(mediaType: MediaType): Genre[] {
    const genres = mediaType === 'movie' ? this.movieGenres() : this.tvGenres();
    return [...genres].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  /** Nomi dei generi di un contenuto, limitati per non far crescere la scheda. */
  namesFor(item: MediaItem, limit = 3): string[] {
    const mediaType = resolveMediaType(item);
    const map = this.byId();
    return (item.genre_ids ?? [])
      .map((id) => map.get(`${mediaType}:${id}`))
      .filter((name): name is string => !!name)
      .slice(0, limit);
  }

  /** Scarica l'elenco una sola volta per tipo; gli errori lasciano la mappa vuota. */
  private load(mediaType: MediaType): void {
    if (this.requested.has(mediaType) || !this.tmdb.isConfigured) {
      return;
    }
    this.requested.add(mediaType);

    this.tmdb.getGenres(mediaType).subscribe({
      next: (genres) => (mediaType === 'movie' ? this.movieGenres : this.tvGenres).set(genres),
      // I nomi dei generi sono un miglioramento, non un requisito: in caso di
      // errore le schede restano leggibili senza le etichette.
      error: () => this.requested.delete(mediaType),
    });
  }
}
