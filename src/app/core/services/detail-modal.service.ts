import { Injectable, computed, signal } from '@angular/core';
import { MediaDetails, MediaItem, MediaType } from '../models';
import { resolveMediaType } from '../utils/media.util';

export interface ModalTarget {
  id: number;
  mediaType: MediaType;

  preview: MediaItem | null;

  autoplay: boolean;
}

@Injectable({ providedIn: 'root' })
export class DetailModalService {
  private readonly target = signal<ModalTarget | null>(null);

  readonly current = this.target.asReadonly();
  readonly isOpen = computed(() => this.target() !== null);

  open(media: MediaItem | MediaDetails, options: { autoplay?: boolean } = {}): void {
    this.target.set({
      id: media.id,
      mediaType: resolveMediaType(media),
      preview: 'genres' in media ? null : (media as MediaItem),
      autoplay: options.autoplay ?? false,
    });
  }

  openById(id: number, mediaType: MediaType, options: { autoplay?: boolean } = {}): void {
    this.target.set({ id, mediaType, preview: null, autoplay: options.autoplay ?? false });
  }

  close(): void {
    this.target.set(null);
  }
}
