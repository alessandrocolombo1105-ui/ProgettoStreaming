import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { MediaDetails, MediaItem, MediaType, MyListItem } from '../models';
import { mediaKey, toMyListItem } from '../utils/media.util';
import { AuthService } from './auth.service';

/** Ogni utente ha la propria lista, così un logout non espone quella altrui. */
function storageKey(userId: string): string {
  return `xflix.mylist.${userId}`;
}

/**
 * "La Mia Lista" dell'utente autenticato.
 *
 * Lo stato vive in un Signal: i componenti lo leggono direttamente nei template
 * e la UI si aggiorna ovunque nello stesso momento — scheda, hero e modale
 * condividono la stessa sorgente di verità.
 */
@Injectable({ providedIn: 'root' })
export class MyListService {
  private readonly auth = inject(AuthService);
  private readonly items = signal<MyListItem[]>([]);

  /** Voci salvate, dalla più recente alla più vecchia. */
  readonly list = computed(() =>
    [...this.items()].sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
  );

  readonly count = computed(() => this.items().length);
  readonly isEmpty = computed(() => this.items().length === 0);

  /**
   * Insieme delle chiavi salvate: permette a `isInList` di rispondere in tempo
   * costante anche con decine di schede visibili contemporaneamente.
   */
  private readonly keys = computed(
    () => new Set(this.items().map((item) => mediaKey(item.id, item.mediaType))),
  );

  constructor() {
    // Al cambio di utente la lista viene ricaricata; al logout si svuota.
    effect(() => {
      const user = this.auth.user();
      this.items.set(user ? this.read(user.id) : []);
    });
  }

  isInList(id: number, mediaType: MediaType): boolean {
    return this.keys().has(mediaKey(id, mediaType));
  }

  /**
   * Aggiunge o rimuove il titolo e restituisce lo stato risultante.
   * Torna `false` senza modificare nulla se non c'è un utente autenticato.
   */
  toggle(media: MediaItem | MediaDetails): boolean {
    const entry = toMyListItem(media);
    const alreadySaved = this.isInList(entry.id, entry.mediaType);

    if (alreadySaved) {
      this.remove(entry.id, entry.mediaType);
      return false;
    }

    this.commit([...this.items(), entry]);
    return true;
  }

  add(media: MediaItem | MediaDetails): void {
    const entry = toMyListItem(media);
    if (this.isInList(entry.id, entry.mediaType)) {
      return;
    }
    this.commit([...this.items(), entry]);
  }

  remove(id: number, mediaType: MediaType): void {
    const target = mediaKey(id, mediaType);
    this.commit(this.items().filter((item) => mediaKey(item.id, item.mediaType) !== target));
  }

  clear(): void {
    this.commit([]);
  }

  /* ----------------------------------------------------------------------
     Persistenza
     ---------------------------------------------------------------------- */

  /** Aggiorna lo stato e lo riversa su storage, se c'è una sessione attiva. */
  private commit(items: MyListItem[]): void {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    this.items.set(items);
    this.write(user.id, items);
  }

  private read(userId: string): MyListItem[] {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? (parsed as MyListItem[]) : [];
    } catch {
      return [];
    }
  }

  private write(userId: string, items: MyListItem[]): void {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(items));
    } catch {
      /* Quota esaurita o storage bloccato: la lista resta valida in memoria. */
    }
  }
}
