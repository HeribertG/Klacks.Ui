// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-fp-rectangle',
  styleUrls: ['./icon.scss'],
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <rect x="0" y="0" width="24" height="24"></rect>
        <rect fill="var(--iconStandartColor)" x="4" y="4" width="16" height="16" rx="2"></rect>
      </g>
    </svg>
  `,
  standalone: true,
})
export class IconFpRectangleComponent {}
