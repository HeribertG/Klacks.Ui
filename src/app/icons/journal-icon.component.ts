import { Component } from '@angular/core';

@Component({
  selector: 'icon-journal-icon',
  styleUrls: ['./buttons.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      x="0px"
      y="0px"
      width="24px"
      height="18px"
      viewBox="0 0 48 48"
    >
      <g>
        <path
          fill="#b6b6c3"
          d="M43,13c0-1.10457-0.89543-2-2-2H6c-1.6543,0-3-1.3457-3-3c0-0.55225-0.44775-1-1-1S1,7.44775,1,8v32
	c0,3.86599,3.13401,7,7,7h33c1.10457,0,2-0.89543,2-2V13z"
        />
        <path
          fill="#464e5f"
          d="M46,24H36c-2.75684,0-5,2.24316-5,5s2.24316,5,5,5h10c0.55225,0,1-0.44775,1-1v-8
	C47,24.44775,46.55225,24,46,24z"
        />
        <path
          fill="#000000"
          d="M4,5h28c1.10457,0,2,0.89543,2,2v4H4c-1.65685,0-3-1.34314-3-3V8C1,6.34314,2.34314,5,4,5z"
        />

        <path
          fill="#b6b6c3"
          d="M37,2H7C6.44772,2,6,2.44772,6,3v8h32V3C38,2.44772,37.55228,2,37,2z"
        />
        <rect x="9" y="5" fill="white" width="26" height="6" />
      </g>
    </svg>
  `,
  styles: [''],
  standalone: true,
})
export class JournalIconComponent {}
