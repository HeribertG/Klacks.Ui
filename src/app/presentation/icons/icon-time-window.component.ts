import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-time-window',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--iconStandartColor)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Das Ziffernblatt -->
      <circle cx="12" cy="12" r="10" />

      <!-- Die Markierungen für 12, 3, 6, 9 Uhr -->
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m22 12-2 0" />
      <path d="m4 12-2 0" />

      <!-- Das hervorgehobene Zeitfenster (als Segment von 9 bis 12 Uhr) -->
      <path
        d="M 12 12 L 12 2 A 10 10 0 0 0 2 12 Z"
        fill="var(--iconStandartColor)"
        fill-opacity="0.3"
        stroke-width="0"
      />
    </svg>
  `,
  standalone: true,
})
export class IconTimeWindowComponent {}
