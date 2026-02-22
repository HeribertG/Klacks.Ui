// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-paste-grey',
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
        d="M9 3C8.44772 3 8 3.44772 8 4V5H7C5.89543 5 5 5.89543 5 7V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V7C19 5.89543 18.1046 5 17 5H16V4C16 3.44772 15.5523 3 15 3H9ZM10 5H14V6H10V5ZM7 7H8V8C8 8.55228 8.44772 9 9 9H15C15.5523 9 16 8.55228 16 8V7H17V20H7V7Z"
      />
    </svg>
  `,
  standalone: true,
})
export class IconPasteGreyComponent {}
