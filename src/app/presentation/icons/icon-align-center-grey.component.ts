import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-align-center-grey',
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
        d="M3 3h18v2H3V3zm4 4h10v2H7V7zm-4 4h18v2H3v-2zm4 4h10v2H7v-2zm-4 4h18v2H3v-2z"
      />
    </svg>
  `,
  standalone: true,
})
export class IconAlignCenterGreyComponent {}
