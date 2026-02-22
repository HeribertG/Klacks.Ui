// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-mml',
  styleUrls: ['./icon.scss'],
  template: ` <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    role="img"
  >
    <rect
      x="4"
      y="6"
      width="16"
      height="12"
      rx="3"
      fill="var(--iconStandartColor)"
      opacity="0.3"
    />

    <rect
      x="11.25"
      y="2"
      width="1.5"
      height="3"
      fill="var(--iconStandartColor)"
    />
    <circle cx="12" cy="2" r="1" fill="var(--iconStandartColor)" />

    <circle cx="8.5" cy="11.5" r="1.5" fill="var(--iconStandartColor)" />
    <circle cx="15.5" cy="11.5" r="1.5" fill="var(--iconStandartColor)" />

    <path
      d="M8 15c0 2 8 2 8 0"
      stroke="var(--iconStandartColor)"
      opacity="0.6"
      stroke-width="1.5"
      fill="none"
      stroke-linecap="round"
    />
    <rect
      x="9"
      y="18"
      width="6"
      height="3"
      rx="1"
      fill="var(--iconStandartColor)"
    />
  </svg>`,
  standalone: true,
})
export class IconMMLComponent {}
