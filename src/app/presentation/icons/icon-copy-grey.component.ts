// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-copy-grey',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="var(--iconStandartColor)"
        opacity="0.4"
        d="M7 6V3C7 1.89543 7.89543 1 9 1H19C20.1046 1 21 1.89543 21 3V17C21 18.1046 20.1046 19 19 19H17V21C17 22.1046 16.1046 23 15 23H5C3.89543 23 3 22.1046 3 21V9C3 7.89543 3.89543 7 5 7H7V6ZM9 7H15C16.1046 7 17 7.89543 17 9V17H19V3H9V7ZM5 9V21H15V9H5Z"
      />
    </svg>
  `,
  standalone: true,
})
export class IconCopyGreyComponent {}
