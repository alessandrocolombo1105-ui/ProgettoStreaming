import { Injectable, computed, inject, signal } from '@angular/core';
import { Genre, MediaItem, MediaType } from '../models';
import { resolveMediaType } from '../utils/media.util';
import { TmdbService } from './tmdb.service';

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

  list(mediaType: MediaType): Genre[] {
    const genres = mediaType === 'movie' ? this.movieGenres() : this.tvGenres();
    return [...genres].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  namesFor(item: MediaItem, limit = 3): string[] {
    const mediaType = resolveMediaType(item);
    const map = this.byId();
    return (item.genre_ids ?? [])
      .map((id) => map.get(`${mediaType}:${id}`))
      .filter((name): name is string => !!name)
      .slice(0, limit);
  }

  private load(mediaType: MediaType): void {
    if (this.requested.has(mediaType) || !this.tmdb.isConfigured) {
      return;
    }
    this.requested.add(mediaType);

    this.tmdb.getGenres(mediaType).subscribe({
      next: (genres) => (mediaType === 'movie' ? this.movieGenres : this.tvGenres).set(genres),
      error: () => this.requested.delete(mediaType),
    });
  }
}
