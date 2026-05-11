// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-settings-three',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      width="20px"
      height="20px"
      viewBox="0 0 24 24"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        fill="var(--iconStandartColor)"
        opacity="0.3"
        x="2"
        y="6"
        width="21"
        height="12"
        rx="6"
      ></rect>
      <circle fill="var(--iconStandartColor)" cx="17" cy="12" r="4"></circle>
    </svg>
  `,
  standalone: true,
})
export class IconSettingsThreeComponent {}
