import { Component } from '@angular/core';

@Component({
  selector: 'app-icon-briefcase',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="30px"
      height="30px"
      viewBox="0 0 48 48"
      version="1"
      enable-background="new 0 0 48 48"
    >
      <path
        fill="var(--iconStandartColor)"
        opacity="1"
        d="M27,7h-6c-1.7,0-3,1.3-3,3v3h2v-3c0-0.6,0.4-1,1-1h6c0.6,0,1,0.4,1,1v3h2v-3C30,8.3,28.7,7,27,7z"
      />
      <path
        fill="var(--iconStandartColor)"
        opacity="0.3"
        d="M40,43H8c-2.2,0-4-1.8-4-4V15c0-2.2,1.8-4,4-4h32c2.2,0,4,1.8,4,4v24C44,41.2,42.2,43,40,43z"
      />
      <path
        fill="var(--iconStandartColor)"
        opacity="0.4"
        d="M40,28H8c-2.2,0-4-1.8-4-4v-9c0-2.2,1.8-4,4-4h32c2.2,0,4,1.8,4,4v9C44,26.2,42.2,28,40,28z"
      />
      <path
        fill="var(--iconStandartColor)"
        opacity="1"
        d="M26,26h-4c-0.6,0-1-0.4-1-1v-2c0-0.6,0.4-1,1-1h4c0.6,0,1,0.4,1,1v2C27,25.6,26.6,26,26,26z"
      />
    </svg>
  `,
  standalone: true,
})
export class IconBriefCaseComponent {}
