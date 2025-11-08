import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-unknown-time',
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
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m22 12-2 0" />
      <path d="m4 12-2 0" />

      <!-- Das Fragezeichen für "unbekannt" -->
      <path
        opacity="0.3"
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
        stroke-width="2"
      />
      <path opacity="0.3" d="M12 17h.01" stroke-width="2.5" />
    </svg>
  `,
  standalone: true,
})
export class IconUnknownTimeComponent {}
