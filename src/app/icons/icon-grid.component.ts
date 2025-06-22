import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-grid',
  styleUrls: ['./buttons.scss'],
  template: `
    <svg
      svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
    >
      <!-- Drei Reihen gefüllt -->
      <rect x="2" y="4" width="20" height="4" fill="var(--iconStandartColor)" />
      <rect
        x="2"
        y="10"
        width="20"
        height="4"
        fill="var(--iconStandartColor)"
      />
      <rect
        x="2"
        y="16"
        width="20"
        height="4"
        fill="var(--iconStandartColor)"
      />
    </svg>
  `,
  standalone: true,
})
export class IconGridComponent {}
