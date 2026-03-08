// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-fp-save',
  styleUrls: ['./icon.scss'],
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <rect x="0" y="0" width="24" height="24"></rect>
        <polygon points="0 0 24 0 24 24 0 24"></polygon>
        <path d="M17,4 L6,4 C4.79111111,4 4,4.7 4,6 L4,18 C4,19.3 4.79111111,20 6,20 L18,20 C19.2,20 20,19.3 20,18 L20,7.20710678 C20,7.07449854 19.9473216,6.94732158 19.8535534,6.85355339 L17,4 Z M17,11 L7,11 L7,4 L17,4 L17,11 Z" fill="var(--iconStandartColor)" fill-rule="nonzero"></path>
        <rect fill="var(--iconStandartColor)" opacity="0.3" x="12" y="4" width="3" height="5" rx="0.5"></rect>
      </g>
    </svg>
  `,
  standalone: true,
})
export class IconFpSaveComponent {}
