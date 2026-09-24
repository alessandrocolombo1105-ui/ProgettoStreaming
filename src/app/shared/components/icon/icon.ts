import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Shape =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'polygon'; points: string };

const p = (d: string): Shape => ({ kind: 'path', d });
const circle = (cx: number, cy: number, r: number): Shape => ({ kind: 'circle', cx, cy, r });
const polygon = (points: string): Shape => ({ kind: 'polygon', points });

const ICONS = {
  play: [polygon('6 3 20 12 6 21 6 3')],
  plus: [p('M5 12h14'), p('M12 5v14')],
  check: [p('M20 6 9 17l-5-5')],
  close: [p('M18 6 6 18'), p('m6 6 12 12')],
  search: [circle(11, 11, 8), p('m21 21-4.3-4.3')],
  chevronLeft: [p('m15 18-6-6 6-6')],
  chevronRight: [p('m9 18 6-6-6-6')],
  chevronDown: [p('m6 9 6 6 6-6')],
  info: [circle(12, 12, 10), p('M12 16v-4'), p('M12 8h.01')],
  star: [
    polygon(
      '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2',
    ),
  ],
  user: [p('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'), circle(12, 7, 4)],
  logout: [p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), p('m16 17 5-5-5-5'), p('M21 12H9')],
  filter: [polygon('22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3')],
  menu: [p('M4 6h16'), p('M4 12h16'), p('M4 18h16')],
  trash: [
    p('M3 6h18'),
    p('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'),
    p('M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'),
  ],
  alert: [
    p('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'),
    p('M12 9v4'),
    p('M12 17h.01'),
  ],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      [attr.fill]="filled() ? 'currentColor' : 'none'"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @for (shape of shapes(); track $index) {
        @switch (shape.kind) {
          @case ('path') {
            <svg:path [attr.d]="shape.d" />
          }
          @case ('circle') {
            <svg:circle [attr.cx]="shape.cx" [attr.cy]="shape.cy" [attr.r]="shape.r" />
          }
          @case ('polygon') {
            <svg:polygon [attr.points]="shape.points" />
          }
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);

  readonly filled = input(false);
  readonly strokeWidth = input(2);

  protected readonly shapes = computed<readonly Shape[]>(() => ICONS[this.name()]);
}
