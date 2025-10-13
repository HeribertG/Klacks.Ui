import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-align-right-grey',
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
        d="M3 3h18v2H3V3zm6 4h12v2H9V7zm-6 4h18v2H3v-2zm6 4h12v2H9v-2zm-6 4h18v2H3v-2z"
      />
    </svg>
  `,
  standalone: true,
})
export class IconAlignRightGreyComponent {}
