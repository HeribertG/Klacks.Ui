// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-info',
  styleUrls: ['./icon.scss'],
  template: ` <svg
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
  >
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
      <rect id="bound" x="0" y="0" width="24" height="24"></rect>
      <circle
        id="Oval-5"
        fill="var(--iconStandartColor)"
        opacity="0.3"
        cx="12"
        cy="12"
        r="10"
      ></circle>
      <rect
        id="Rectangle-9"
        fill="var(--iconStandartColor)"
        x="11"
        y="10"
        width="2"
        height="7"
        rx="1"
      ></rect>
      <rect
        id="Rectangle-9-Copy"
        fill="var(--iconStandartColor)"
        x="11"
        y="7"
        width="2"
        height="2"
        rx="1"
      ></rect>
    </g>
  </svg>`,
  standalone: true,
})
export class InfoIconComponent {}
