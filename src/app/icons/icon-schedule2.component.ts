import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-schedule2',
  styleUrls: ['./buttons.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32px"
      height="32px"
      viewBox="0 0 48 48"
      version="1"
      enable-background="new 0 0 48 48"
    >
      <g fill="var(--iconBlackColor)" opacity="1">
        <polygon
          points="17.8,18.1 10.4,25.4 6.2,21.3 4,23.5 10.4,29.9 20,20.3"
        />
        <polygon points="17.8,5.1 10.4,12.4 6.2,8.3 4,10.5 10.4,16.9 20,7.3" />
        <polygon
          points="17.8,31.1 10.4,38.4 6.2,34.3 4,36.5 10.4,42.9 20,33.3"
        />
      </g>
      <g fill="var(--iconBlackColor)" opacity="0.4">
        <rect x="24" y="22" width="20" height="4" />
        <rect x="24" y="9" width="20" height="4" />
        <rect x="24" y="35" width="20" height="4" />
      </g>
    </svg>
  `,
  standalone: true,
})
export class IconSchedule2Component {}
