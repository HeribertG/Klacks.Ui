// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-grip-vertical',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12px"
      height="12px"
      viewBox="0 0 16 16"
    >
      <circle
        cx="5.5"
        cy="3"
        r="1.5"
        fill="var(--iconStandartColor)"
        opacity="0.9"
      />
      <circle
        cx="10.5"
        cy="3"
        r="1.5"
        fill="var(--iconStandartColor)"
        opacity="0.9"
      />
      <circle
        cx="5.5"
        cy="8"
        r="1.5"
        fill="var(--iconStandartColor)"
        opacity="0.9"
      />
      <circle
        cx="10.5"
        cy="8"
        r="1.5"
        fill="var(--iconStandartColor)"
        opacity="0.9"
      />
      <circle
        cx="5.5"
        cy="13"
        r="1.5"
        fill="var(--iconStandartColor)"
        opacity="0.9"
      />
      <circle
        cx="10.5"
        cy="13"
        r="1.5"
        fill="var(--iconStandartColor)"
        opacity="0.9"
      />
    </svg>
  `,
  standalone: true,
})
export class IconGripVerticalComponent {}
