import { MediaItem } from '../models';
import { getMediaTitle, getOriginalTitle } from './media.util';

/**
 * Ordinamento dei risultati di ricerca per aderenza al testo digitato.
 *
 * TMDB cerca in modo fuzzy e ordina per popolarità: con tre lettere restituisce
 * titoli che con quelle lettere non cominciano nemmeno. Riordinandoli qui, il
 * carosello mostra prima ciò che inizia davvero con quanto si sta scrivendo, e
 * si affina da sé a ogni carattere aggiunto.
 */

/**
 * Minuscolo e senza accenti, senza toccare la lunghezza della stringa.
 *
 * "Amélie" e "amelie" devono corrispondere; nessun `trim` qui, perché gli
 * indici calcolati su questo risultato servono a ritagliare la stringa
 * originale in `splitOnMatch`.
 */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    // Rimuove i segni diacritici lasciando la lettera di base.
    .replace(/[̀-ͯ]/g, '');
}

/** Fasce di aderenza, dalla più stretta alla più larga. */
const TIER_STARTS_WITH = 0;
const TIER_WORD_START = 1;
const TIER_CONTAINS = 2;
const TIER_OTHER = 3;

function tierOfTitle(title: string, query: string): number {
  const haystack = fold(title).trim();
  const needle = fold(query).trim();

  if (!needle || haystack.startsWith(needle)) {
    return TIER_STARTS_WITH;
  }

  const index = haystack.indexOf(needle);
  if (index === -1) {
    return TIER_OTHER;
  }

  // Un carattere non alfanumerico prima della corrispondenza significa che
  // questa cade all'inizio di una parola: "guerre" dentro "Star Wars: Guerre".
  return /[^a-z0-9]/.test(haystack[index - 1] ?? '') ? TIER_WORD_START : TIER_CONTAINS;
}

/**
 * Aderenza di un contenuto, valutata sul titolo tradotto e su quello
 * originale.
 *
 * Considerare solo il titolo italiano spingerebbe in fondo "Guerre stellari"
 * per la ricerca "star", che è invece esattamente ciò che l'utente cerca: vale
 * la corrispondenza migliore fra i due.
 */
function tierOf(item: MediaItem, query: string): number {
  return Math.min(
    tierOfTitle(getMediaTitle(item), query),
    tierOfTitle(getOriginalTitle(item), query),
  );
}

/**
 * Riordina i risultati per aderenza, mantenendo la popolarità come criterio
 * secondario all'interno di ogni fascia.
 *
 * L'ordinamento è stabile rispetto alla risposta di TMDB per gli elementi
 * equivalenti, così i titoli non ballano fra una battitura e l'altra.
 */
export function rankByRelevance(items: MediaItem[], query: string): MediaItem[] {
  const term = query.trim();
  if (!term) {
    return items;
  }

  return items
    .map((item, index) => ({ item, index, tier: tierOf(item, term) }))
    .sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }
      const byPopularity = (b.item.popularity ?? 0) - (a.item.popularity ?? 0);
      return byPopularity !== 0 ? byPopularity : a.index - b.index;
    })
    .map(({ item }) => item);
}

/** Segmento di titolo, marcato se coincide con il testo cercato. */
export interface TitlePart {
  text: string;
  match: boolean;
}

/**
 * Spezza il titolo evidenziando la porzione che corrisponde al testo cercato.
 *
 * Restituisce dati invece di HTML: costruire markup da una stringa di rete
 * obbligherebbe a passare dal sanitizer per reinserirlo nel template.
 */
export function splitOnMatch(title: string, query: string): TitlePart[] {
  const whole: TitlePart[] = [{ text: title, match: false }];
  const folded = fold(title);
  const needle = fold(query.trim());

  /*
   * `fold` conserva la lunghezza per i casi comuni, ma non per tutti: una
   * stringa già in forma NFD, o lettere come "İ" il cui minuscolo occupa due
   * code unit, romperebbero la corrispondenza fra indici. Quando la lunghezza
   * cambia si rinuncia all'evidenziazione invece di ritagliare a caso.
   */
  if (!needle || folded.length !== title.length) {
    return whole;
  }

  const index = folded.indexOf(needle);
  if (index === -1) {
    return whole;
  }

  return [
    { text: title.slice(0, index), match: false },
    { text: title.slice(index, index + needle.length), match: true },
    { text: title.slice(index + needle.length), match: false },
  ].filter((part) => part.text.length > 0);
}
