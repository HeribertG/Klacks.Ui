import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-compact',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 26 26"
      width="26"
      height="26"
      fill="none"
      stroke="var(--iconStandartColor)"
      stroke-opacity="0.4"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Pfeil oben, der nach unten zeigt -->

      <path d="M13 3 L 13 9" />
      <path d="M10 6 L 13 9 L 16 6" />

      <!-- Horizontale Linien in der Mitte -->
      <path d="M5 11.5 H 21" stroke-opacity="1.0" />
      <path d="M5 15.5 H 21" stroke-opacity="1.0" />

      <!-- Pfeil unten, der nach oben zeigt -->
      stroke="var(--iconStandartColor)" stroke-opacity="0.4"
      <path d="M13 23 L 13 17" />
      <path d="M10 20 L 13 17 L 16 20" />
    </svg>
  `,
  standalone: true,
})
export class IconCompactComponent {}
