// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-route',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--iconStandartColor)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M6 6C9 9 15 15 18 18"
        stroke-dasharray="3 3"
        stroke-opacity="0.4"
      />
      <circle cx="6" cy="6" r="2" stroke-width="2.5" />
      <circle cx="18" cy="18" r="2" stroke-width="2.5" />
    </svg>
  `,
  standalone: true,
})
export class IconRouteComponent {}
