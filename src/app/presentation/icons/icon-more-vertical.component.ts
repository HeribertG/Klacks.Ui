// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Toolbar icon for a "more actions" menu: three vertical dots, drawn in the same 24x24 grid and colour scheme as
 * the other navigation icons.
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { NavIconColorService } from 'src/app/presentation/services/nav-icon-color.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-more-vertical',
  styleUrls: ['./icon.scss'],
  template: ` <svg
    version="1.2"
    xmlns="http://www.w3.org/2000/svg"
    overflow="visible"
    preserveAspectRatio="none"
    viewBox="0 0 26 26"
    height="24"
    width="24"
    [style.color]="currentColor"
  >
    <g transform="translate(1, 1)">
      <g fill-rule="evenodd" fill="none" stroke-width="1" stroke="none">
        <polygon points="0 0 24 0 24 24 0 24" vector-effect="non-scaling-stroke" />
        <circle cx="12" cy="5" r="2.25" fill="currentColor" />
        <circle cx="12" cy="12" r="2.25" fill="currentColor" />
        <circle cx="12" cy="19" r="2.25" fill="currentColor" />
      </g>
    </g>
  </svg>`,
  standalone: true,
})
export class IconMoreVerticalComponent {
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
