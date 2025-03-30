import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-sorting',
  styleUrls: ['./buttons.scss'],
  template: ` <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="3" y="5" width="10" height="2" fill="var(--iconBlackColor)" />
    <rect
      x="3"
      y="10"
      width="10"
      height="2"
      fill="var(--iconBlackColor)"
      opacity="0.3"
    />
    <rect x="3" y="15" width="10" height="2" fill="var(--iconBlackColor)" />
    <polygon points="18,7 16,10 20,10" fill="var(--iconBlackColor)" />
    <polygon
      points="18,17 16,14 20,14"
      fill="var(--iconBlackColor)"
      opacity="0.3"
    />
  </svg>`,
  standalone: false,
})
export class IconSortingComponent {
  constructor() {}
}
