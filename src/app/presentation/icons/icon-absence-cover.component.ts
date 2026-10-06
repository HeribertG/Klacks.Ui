// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Toolbar icon for the "cover absence" action: a person silhouette with a swap badge, drawn in the
 * same 24x24 grid and colour scheme as the other navigation icons.
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { NavIconColorService } from 'src/app/presentation/services/nav-icon-color.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-absence-cover',
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
        <path
          opacity="0.3"
          fill-rule="nonzero"
          fill="currentColor"
          d="M9,11 C6.790861,11 5,9.209139 5,7 C5,4.790861 6.790861,3 9,3 C11.209139,3 13,4.790861 13,7 C13,9.209139 11.209139,11 9,11 Z"
          vector-effect="non-scaling-stroke"
        />
        <path
          fill-rule="nonzero"
          fill="currentColor"
          d="M1.00065168,20.1992055 C1.38825852,15.4265159 5.26191235,13 8.98334134,13 C10.7,13 12.3,13.3 13.7,13.9 C12.6,15.1 12,16.6 12,18.3 C12,19.3 12.2,20.2 12.6,21 C9.9,21 6.3,21 1.72750223,21 C1.47671215,21 0.97953825,20.45918 1.00065168,20.1992055 Z"
          vector-effect="non-scaling-stroke"
        />
        <path
          fill-rule="nonzero"
          fill="currentColor"
          d="M17.5,13 L20.5,16 L18.5,16 L18.5,18.5 L16.5,18.5 L16.5,16 L14.5,16 L17.5,13 Z M19.5,24 L16.5,21 L18.5,21 L18.5,18.5 L20.5,18.5 L20.5,21 L22.5,21 L19.5,24 Z"
          vector-effect="non-scaling-stroke"
        />
      </g>
    </g>
  </svg>`,
  standalone: true,
})
export class IconAbsenceCoverComponent {
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
