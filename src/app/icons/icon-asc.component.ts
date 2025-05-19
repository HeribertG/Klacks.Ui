import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-asc',
  styleUrls: ['./buttons.scss'],
  template: `
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="3"
        y="9"
        fill="var(--iconBlackColor)"
        opacity="0.3"
        font-family="Arial, sans-serif"
        font-size="8"
      >
        A
      </text>

      <text
        x="3"
        y="17"
        fill="var(--iconBlackColor)"
        font-family="Arial, sans-serif"
        font-size="8"
      >
        Z
      </text>

      <line
        x1="14"
        y1="6"
        x2="14"
        y2="14"
        stroke="var(--iconBlackColor)"
        stroke-width="2"
        stroke-linecap="round"
      />
      <polygon points="12,14 14,18 16,14" fill="var(--iconBlackColor)" />
    </svg>
  `,
  standalone: true,
})
export class IconAscComponent {}
