import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-contractless',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"
        opacity="0.6"
      />
      <polyline points="14 2 14 8 20 8" opacity="0.6" />
      <circle cx="16.5" cy="16.5" r="5.5" fill="white" stroke="none" />
      <path d="m13.5 13.5 6 6" stroke="#ef4444" />
      <path d="m19.5 13.5-6 6" stroke="#ef4444" />
    </svg>
  `,
  standalone: true,
})
export class IconContractlessComponent {}
