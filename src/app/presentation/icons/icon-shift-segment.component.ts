import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-shift-segment',
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
      <!-- Der volle 24h-Kreis -->
      <circle cx="12" cy="12" r="10" opacity="0.3" />

      <!-- Der hervorgehobene Abschnitt für die Schicht -->
      <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2.5" />

      <!-- Die Uhrzeiger, die den Abschnitt einrahmen -->
      <path d="M12 12V5" />
      <!-- Zeiger auf 12 Uhr -->
      <path d="M12 12H19" />
      <!-- Zeiger auf 3 Uhr -->
    </svg>
  `,
  standalone: true,
})
export class IconShiftSegmentComponent {}
