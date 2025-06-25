import { Component } from '@angular/core';

@Component({
  selector: 'app-collapse-all-grey',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points="4,6 8,2 12,6"
        fill="none"
        stroke="var(--iconStandartColor)"
        opacity="0.4"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polyline
        points="4,10 8,6 12,10"
        fill="none"
        stroke="var(--iconStandartColor)"
        opacity="0.4"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polyline
        points="4,14 8,10 12,14"
        fill="none"
        stroke="var(--iconStandartColor)"
        opacity="0.4"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  standalone: true,
})
export class IconCollapseAllGreyComponent {}
