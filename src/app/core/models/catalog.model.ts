import { MediaType } from './tmdb.model';

export type SortOption =
  | 'popularity.desc'
  | 'vote_average.desc'
  | 'primary_release_date.desc'
  | 'revenue.desc'
  | 'title.asc';

export interface SortChoice {
  value: SortOption;
  label: string;
}

export const SORT_CHOICES: readonly SortChoice[] = [
  { value: 'popularity.desc', label: 'Più popolari' },
  { value: 'vote_average.desc', label: 'Voto più alto' },
  { value: 'primary_release_date.desc', label: 'Più recenti' },
  { value: 'revenue.desc', label: 'Maggiori incassi' },
  { value: 'title.asc', label: 'Titolo (A-Z)' },
] as const;

export interface CatalogFilters {
  query: string;
  mediaType: MediaType;

  genreId: number | null;

  year: number | null;

  minRating: number;
  sortBy: SortOption;
  page: number;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  query: '',
  mediaType: 'movie',
  genreId: null,
  year: null,
  minRating: 0,
  sortBy: 'popularity.desc',
  page: 1,
};

export interface RowConfig {
  id: string;
  title: string;

  posterLayout?: boolean;
}
