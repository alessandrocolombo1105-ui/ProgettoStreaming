import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MediaItem } from '../../../core/models';
import { resolveMediaType } from '../../../core/utils/media.util';
import { Icon } from '../icon/icon';
import { MovieCard } from '../movie-card/movie-card';

/**
 * Carosello orizzontale di schede.
 *
 * Lo scorrimento resta quello nativo del browser — gestirlo a mano con
 * `transform` romperebbe il trascinamento su touch e la navigazione da
 * tastiera. Le frecce si limitano a chiamare `scrollBy` sulla stessa area.
 */
@Component({
  selector: 'app-movie-row',
  imports: [Icon, MovieCard],
  templateUrl: './movie-row.html',
  styleUrl: './movie-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieRow {
  readonly title = input.required<string>();
  readonly items = input<MediaItem[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  /** Rende le schede come locandine verticali invece che come fotogrammi. */
  readonly posterLayout = input(false);

  private readonly track = viewChild.required<ElementRef<HTMLDivElement>>('track');

  /** Quante schede mostrare come scheletro durante il caricamento. */
  protected readonly skeletons = Array.from({ length: 8 }, (_, index) => index);

  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);

  protected readonly hasItems = computed(() => this.items().length > 0);

  constructor() {

    // Alla prima comparsa delle schede la posizione di scorrimento non ha
    // ancora generato eventi: senza questo calcolo le frecce resterebbero
    // nello stato iniziale anche su liste più corte della finestra.
    afterRenderEffect(() => {
      this.items();
      this.onScroll();
    });
  }

  /** Chiave stabile per `@for`: gli id TMDB si ripetono fra film e serie. */
  protected trackByMedia(_index: number, item: MediaItem): string {
    return `${resolveMediaType(item)}:${item.id}`;
  }

  protected scroll(direction: -1 | 1): void {
    const element = this.track().nativeElement;
    // Si avanza di quasi una schermata, lasciando un'anteprima della scheda
    // successiva come riferimento visivo.
    const amount = element.clientWidth * 0.85;
    element.scrollBy({ left: amount * direction, behavior: 'smooth' });
  }

  /** Aggiorna la visibilità delle frecce in base alla posizione di scorrimento. */
  protected onScroll(): void {
    const { scrollLeft, scrollWidth, clientWidth } = this.track().nativeElement;
    this.atStart.set(scrollLeft <= 8);
    // Tolleranza di 8px: gli arrotondamenti a zoom non intero impedirebbero
    // altrimenti di raggiungere esattamente la fine.
    this.atEnd.set(scrollLeft + clientWidth >= scrollWidth - 8);
  }
}
