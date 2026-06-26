// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generic plugin icon component that renders SVG paths from plugin manifest data.
 * Supports color toggle for active/inactive state, matching existing icon components.
 * @param svgPaths - Array of SVG path definitions with optional opacity
 * @param viewBox - SVG viewBox attribute string
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input
} from '@angular/core';
import { NavIconColorService } from 'src/app/presentation/services/nav-icon-color.service';
import { PluginSvgPath } from 'src/app/domain/models/plugins/plugin-nav-item';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plugin-icon',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      width="24px"
      height="24px"
      [attr.viewBox]="viewBox()"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      [style.color]="currentColor"
    >
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <rect x="0" y="0" width="24" height="24"></rect>
        @for (path of svgPaths(); track path.d) {
          <path
            [attr.d]="path.d"
            [attr.opacity]="path.opacity ?? '1'"
            fill="currentColor"
          ></path>
        }
      </g>
    </svg>
  `,
  standalone: true,
})
export class PluginIconComponent {
  private navIconColorService = inject(NavIconColorService);
  private cdr = inject(ChangeDetectorRef);

  readonly svgPaths = input<PluginSvgPath[]>([]);
  readonly viewBox = input('0 0 24 24');

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
