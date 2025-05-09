import { Component } from '@angular/core';

@Component({
  selector: 'app-expand-all-grey',
  styleUrls: ['./buttons.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <!-- Drei übereinanderliegende Carets, die nach unten zeigen (Expand All) -->
      <polyline
        points="4,2 8,6 12,2"
        fill="none"
        stroke="var(--iconBlackColor)"
        opacity="0.4"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polyline
        points="4,6 8,10 12,6"
        fill="none"
        stroke="var(--iconBlackColor)"
        opacity="0.4"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polyline
        points="4,10 8,14 12,10"
        fill="none"
        stroke="var(--iconBlackColor)"
        opacity="0.4"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  standalone: true,
})
export class IconExpandAllGreyComponent {}
