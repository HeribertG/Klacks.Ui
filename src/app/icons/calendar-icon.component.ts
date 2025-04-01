import { Component } from '@angular/core';

@Component({
  selector: 'calendar-icon-ball',
  styleUrls: ['./buttons.scss'],
  template: `<svg
    width="20px"
    height="20px"
    version="1.1"
    id="Icons"
    viewBox="0 0 32 32"
    w
    xml:space="preserve"
  >
    <style type="text/css">
      .st0 {
        fill: none;
        stroke: var(--iconBlackColor);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-miterlimit: 10;
      }
    </style>
    <rect x="4" y="9" class="st0" width="8" height="6" />
    <rect x="12" y="9" class="st0" width="8" height="6" />
    <rect x="20" y="9" class="st0" width="8" height="6" />
    <rect x="4" y="15" class="st0" width="8" height="6" />
    <rect x="12" y="15" class="st0" width="8" height="6" />
    <rect x="20" y="15" class="st0" width="8" height="6" />
    <rect x="4" y="21" class="st0" width="8" height="6" />
    <rect x="12" y="21" class="st0" width="8" height="6" />
    <rect x="20" y="21" class="st0" width="8" height="6" />
    <line class="st0" x1="4" y1="5" x2="28" y2="5" />
  </svg>`,
  standalone: true,
})
export class CalendarIconComponent {
  constructor() {}
}
