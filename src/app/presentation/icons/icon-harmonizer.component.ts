// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-harmonizer',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="var(--iconStandartColor)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3v18" />
        <path d="M5 8l-3 6h6z" />
        <path d="M19 8l-3 6h6z" />
        <path d="M5 21h14" />
        <path d="M5 8a4 4 0 0 0 4-4h6a4 4 0 0 0 4 4" />
      </g>
    </svg>
  `,
  standalone: true,
})
export class IconHarmonizerComponent {}
