import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-filter',
  styleUrls: ['./icon.scss'],
  template: `<svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon
      points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
      fill="var(--iconStandartColor)"
      fill-opacity="0.3"
      stroke="var(--iconStandartColor)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>`,
  standalone: true,
})
export class IconFilterComponent {}
