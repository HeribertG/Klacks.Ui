// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-fp-line',
  styleUrls: ['./icon.scss'],
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <rect x="0" y="0" width="24" height="24"></rect>
        <path d="M13,9 L13,6 C9.04563815,7.48814977 6.78867438,8.99350441 5,13 L8,13 C8.7428521,12.2 9.98856336,10 13,9 Z" fill="var(--iconStandartColor)" fill-rule="nonzero" opacity="0.3"></path>
        <circle fill="var(--iconStandartColor)" cx="18" cy="7.5" r="3"></circle>
        <circle fill="var(--iconStandartColor)" cx="6" cy="18" r="3"></circle>
      </g>
    </svg>
  `,
  standalone: true,
})
export class IconFpLineComponent {}
