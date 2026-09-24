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

  readonly posterLayout = input(false);

  private readonly track = viewChild.required<ElementRef<HTMLDivElement>>('track');

  protected readonly skeletons = Array.from({ length: 8 }, (_, index) => index);

  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);

  protected readonly hasItems = computed(() => this.items().length > 0);

  constructor() {
    afterRenderEffect(() => {
      this.items();
      this.onScroll();
    });
  }

  protected trackByMedia(_index: number, item: MediaItem): string {
    return `${resolveMediaType(item)}:${item.id}`;
  }

  protected scroll(direction: -1 | 1): void {
    const element = this.track().nativeElement;

    const amount = element.clientWidth * 0.85;
    element.scrollBy({ left: amount * direction, behavior: 'smooth' });
  }

  protected onScroll(): void {
    const { scrollLeft, scrollWidth, clientWidth } = this.track().nativeElement;
    this.atStart.set(scrollLeft <= 8);

    this.atEnd.set(scrollLeft + clientWidth >= scrollWidth - 8);
  }
}
