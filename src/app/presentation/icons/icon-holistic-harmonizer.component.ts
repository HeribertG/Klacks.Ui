// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-holistic-harmonizer',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="var(--iconStandartColor)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 8h.01" />
        <path d="M12 8h.01" />
        <path d="M16 8h.01" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
        <path d="M9 21l3-3 3 3" />
      </g>
    </svg>
  `,
  standalone: true,
})
export class IconHolisticHarmonizerComponent {}
