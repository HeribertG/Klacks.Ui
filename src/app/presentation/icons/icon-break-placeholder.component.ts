// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { NavIconColorService } from 'src/app/presentation/services/nav-icon-color.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-break-placeholder',
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
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
      <line
        x1="10"
        y1="13"
        x2="14"
        y2="17"
        stroke="#e74c3c"
        stroke-width="2.5"
      ></line>
      <line
        x1="14"
        y1="13"
        x2="10"
        y2="17"
        stroke="#e74c3c"
        stroke-width="2.5"
      ></line>
    </svg>
  `,
  standalone: true,
})
export class IconBreakPlaceholderComponent {
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
