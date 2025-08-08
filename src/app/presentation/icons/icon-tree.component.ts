import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-tree',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="var(--iconStandartColor)"
      stroke-width="2"
      stroke-linecap="round"
    >
      <rect x="2" y="5" width="20" height="2" />
      <rect x="6" y="11" width="16" height="2" />
      <rect x="6" y="17" width="16" height="2" />
    </svg>
  `,
  standalone: true,
})
export class IconTreeComponent {}
