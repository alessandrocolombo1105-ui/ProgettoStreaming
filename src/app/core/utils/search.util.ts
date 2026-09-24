import { MediaItem } from '../models';
import { getMediaTitle, getOriginalTitle } from './media.util';

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

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

  return /[^a-z0-9]/.test(haystack[index - 1] ?? '') ? TIER_WORD_START : TIER_CONTAINS;
}

function tierOf(item: MediaItem, query: string): number {
  return Math.min(
    tierOfTitle(getMediaTitle(item), query),
    tierOfTitle(getOriginalTitle(item), query),
  );
}

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

export interface TitlePart {
  text: string;
  match: boolean;
}

export function splitOnMatch(title: string, query: string): TitlePart[] {
  const whole: TitlePart[] = [{ text: title, match: false }];
  const folded = fold(title);
  const needle = fold(query.trim());

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
