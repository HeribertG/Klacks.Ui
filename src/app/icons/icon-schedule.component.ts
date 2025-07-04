import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-schedule',
  styleUrls: ['./icon.scss'],
  template: ` <svg
    version="1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    enable-background="new 0 0 48 48"
    height="24"
    width="24"
  >
    <path
      fill="var(--iconStandartColor)"
      opacity="0.3"
      d="M5,38V14h38v24c0,2.2-1.8,4-4,4H9C6.8,42,5,40.2,5,38z"
    />
    <path
      fill="var(--iconStandartColor)"
      opacity="1"
      d="M43,10v6H5v-6c0-2.2,1.8-4,4-4h30C41.2,6,43,7.8,43,10z"
    />
    <g opacity="0.8">
      <circle cx="33" cy="10" r="3" />
      <circle cx="15" cy="10" r="3" />
    </g>
    <g fill="var(--iconStandartColor)">
      <path
        d="M33,3c-1.1,0-2,0.9-2,2v5c0,1.1,0.9,2,2,2s2-0.9,2-2V5C35,3.9,34.1,3,33,3z"
      />
      <path
        d="M15,3c-1.1,0-2,0.9-2,2v5c0,1.1,0.9,2,2,2s2-0.9,2-2V5C17,3.9,16.1,3,15,3z"
      />
    </g>
    <g fill="var(--iconStandartColor)" opacity="1">
      <rect x="13" y="20" width="4" height="4" />
      <rect x="19" y="20" width="4" height="4" />
      <rect x="25" y="20" width="4" height="4" />
      <rect x="31" y="20" width="4" height="4" />
      <rect x="13" y="26" width="4" height="4" />
      <rect x="19" y="26" width="4" height="4" />
      <rect x="25" y="26" width="4" height="4" />
      <rect x="31" y="26" width="4" height="4" />
      <rect x="13" y="32" width="4" height="4" />
      <rect x="19" y="32" width="4" height="4" />
      <rect x="25" y="32" width="4" height="4" />
      <rect x="31" y="32" width="4" height="4" />
    </g>
  </svg>`,
  standalone: true,
})
export class IconScheduleComponent {}
