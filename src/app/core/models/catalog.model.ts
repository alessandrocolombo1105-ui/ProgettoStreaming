import { MediaType } from './tmdb.model';

/** Criteri di ordinamento di `/discover`, con etichetta pronta per la UI. */
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

/**
 * Stato dei filtri del catalogo. `query` ha la precedenza su tutto il resto:
 * quando è valorizzata si usa `/search`, che non accetta i filtri di discover.
 */
export interface CatalogFilters {
  query: string;
  mediaType: MediaType;
  /** `null` = tutti i generi. */
  genreId: number | null;
  /** `null` = tutti gli anni. */
  year: number | null;
  /** Voto medio minimo, da 0 a 10. */
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

/** Descrive una riga del carosello in home. */
export interface RowConfig {
  id: string;
  title: string;
  /** Rende la riga con card in formato locandina verticale invece che backdrop. */
  posterLayout?: boolean;
}
