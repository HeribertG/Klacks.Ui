import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-sorting',
  styleUrls: ['./icon.scss'],
  template: ` <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="3" y="5" width="10" height="2" fill="var(--iconStandartColor)" />
    <rect
      x="3"
      y="10"
      width="10"
      height="2"
      fill="var(--iconStandartColor)"
      opacity="0.3"
    />
    <rect x="3" y="15" width="10" height="2" fill="var(--iconStandartColor)" />
    <polygon points="18,7 16,10 20,10" fill="var(--iconStandartColor)" />
    <polygon
      points="18,17 16,14 20,14"
      fill="var(--iconStandartColor)"
      opacity="0.3"
    />
  </svg>`,
  standalone: true,
})
export class IconSortingComponent {
  constructor() {}
}
