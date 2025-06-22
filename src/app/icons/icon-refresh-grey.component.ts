import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-refresh-grey',
  styleUrls: ['./buttons.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--iconStandartColor)"
      opacity="0.4"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Pfeilkopf rechts oben -->
      <polyline points="23 4 23 10 17 10" />
      <!-- Pfeilkopf links unten -->
      <polyline points="1 20 1 14 7 14" />
      <!-- Obere Kreisbahn -->
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <!-- Untere Kreisbahn -->
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  `,
  standalone: true,
})
export class IconRefreshGreyComponent {}
