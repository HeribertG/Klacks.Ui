// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { NavIconColorService } from 'src/app/presentation/services/nav-icon-color.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-refresh-schedule',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  `,
  standalone: true,
})
export class IconRefreshScheduleComponent {
  private navIconColorService = inject(NavIconColorService);
  private cdr = inject(ChangeDetectorRef);

  private isSelected = false;

  get currentColor(): string {
    return this.isSelected
      ? this.navIconColorService.iconSelectionColor
      : this.navIconColorService.iconStandartColor;
  }

  public ChangeColor(isSelected = false): void {
    this.isSelected = isSelected;
    this.cdr.markForCheck();
  }
}
