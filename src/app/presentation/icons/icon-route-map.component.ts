// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Icon component for the folded-map symbol (tour map view).
 * Strokes and the shaded middle panel use currentColor, so the host element decides the colour (e.g. an active toggle).
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-route-map',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      width="24"
      height="24"
      viewBox="0 -0.28 46.384 46.384"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        transform="translate(-369.028 -1786.405)"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="4"
      >
        <path d="M384.789,1824.733l-13.761,5.5v-36.329l13.761-5.5Z" fill="none" />
        <path d="M413.412,1824.733l-13.761,5.5v-36.329l13.761-5.5Z" fill="none" />
        <path
          d="M385.34,1824.733l13.761,5.5v-36.329l-13.761-5.5Z"
          fill="currentColor"
          fill-opacity="0.3"
        />
      </g>
    </svg>
  `,
  standalone: true,
})
export class IconRouteMapComponent {}
