import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-add',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="var(--standartGreenColor)"
    >
      <rect x="10" y="2" width="4" height="20" />
      <rect x="2" y="10" width="20" height="4" />
    </svg>
  `,
  standalone: true,
})
export class IconAddComponent {}
