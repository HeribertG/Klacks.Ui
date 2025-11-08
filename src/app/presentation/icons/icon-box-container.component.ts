import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-box-container',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--iconStandartColor)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Gefüllte obere Seite (am hellsten) -->
      <path
        d="m3.27 6.96 8.73-5.05 8.73 5.05-8.73 5.05-8.73-5.05z"
        fill="currentColor"
        fill-opacity="0.1"
        stroke="none"
      />
      <!-- Gefüllte rechte Seite (etwas dunkler) -->
      <path
        d="M12 12v10.08l8.73-5.05V7l-8.73 5.05z"
        fill="currentColor"
        fill-opacity="0.3"
        stroke="none"
      />

      <!-- Die äußere Form der Box (wird über die Füllung gezeichnet) -->
      <path
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      />

      <!-- Die inneren Linien -->
      <path d="m3.27 6.96 8.73 5.05" />
      <path d="m12 22.08V12" />
    </svg>
  `,
  standalone: true,
})
export class IconBoxContainerComponent {}
