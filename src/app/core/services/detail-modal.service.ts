import { Injectable, computed, signal } from '@angular/core';
import { MediaDetails, MediaItem, MediaType } from '../models';
import { resolveMediaType } from '../utils/media.util';

/** Contenuto richiesto dalla modale, più i dati già noti per l'apertura immediata. */
export interface ModalTarget {
  id: number;
  mediaType: MediaType;
  /** Titolo e locandina della scheda cliccata: evitano una modale vuota nell'attesa. */
  preview: MediaItem | null;
  /** Apre la modale direttamente sul player invece che sulla scheda dettagli. */
  autoplay: boolean;
}

/**
 * Coordina l'unica modale dettagli dell'applicazione.
 *
 * Header, hero, caroselli e catalogo ne condividono una sola istanza montata in
 * `App`: senza questo servizio ogni scheda dovrebbe propagare l'apertura fino
 * alla radice attraverso la gerarchia dei componenti.
 */
@Injectable({ providedIn: 'root' })
export class DetailModalService {
  private readonly target = signal<ModalTarget | null>(null);

  readonly current = this.target.asReadonly();
  readonly isOpen = computed(() => this.target() !== null);

  /** Apre la modale su un contenuto di cui si conosce già la scheda. */
  open(media: MediaItem | MediaDetails, options: { autoplay?: boolean } = {}): void {
    this.target.set({
      id: media.id,
      mediaType: resolveMediaType(media),
      preview: 'genres' in media ? null : (media as MediaItem),
      autoplay: options.autoplay ?? false,
    });
  }

  /** Apre la modale partendo da id e tipo, ad esempio da un link diretto. */
  openById(id: number, mediaType: MediaType, options: { autoplay?: boolean } = {}): void {
    this.target.set({ id, mediaType, preview: null, autoplay: options.autoplay ?? false });
  }

  close(): void {
    this.target.set(null);
  }
}
