// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Renders the named canvas icons of grid cells (CellIcon.svgIcon) into cached canvases. Only names with a case in
 * getSvgForIcon are drawn; the lock and moved icons of work cells take their colors from the theme's CSS variables,
 * resolved here because an SVG drawn into a canvas cannot read CSS variables.
 * @param svgIconName - Registered icon name (pp-icon-*)
 * @param size - Edge length in CSS pixels
 */
import { Injectable, inject } from '@angular/core';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { IconBoxContainerComponent } from 'src/app/presentation/icons/icon-box-container.component';
import { IconInContainerComponent } from 'src/app/presentation/icons/icon-in-container.component';
import { IconPencilComponent } from 'src/app/presentation/icons/icon-pencil.component';
import { IconWorkApprovedComponent } from 'src/app/presentation/icons/icon-work-approved.component';
import { IconWorkClosedComponent } from 'src/app/presentation/icons/icon-work-closed.component';
import { IconWorkConfirmedComponent } from 'src/app/presentation/icons/icon-work-confirmed.component';
import { IconWorkMovedComponent } from 'src/app/presentation/icons/icon-work-moved.component';
import { DEFAULT_ICON_SIZE } from '../../classes/cell-icon';
import {
  WORK_APPROVED_ICON,
  WORK_CLOSED_ICON,
  WORK_CONFIRMED_ICON,
  WORK_MOVED_ICON,
} from '../../constants/work-cell-icon.constants';

const POSITIVE_COLOR_VARIABLE = '--standartGreenColor';
const POSITIVE_FALLBACK_COLOR = '#1bc5bd';
const WARNING_COLOR_VARIABLE = '--colorWarning';
const WARNING_FALLBACK_COLOR = '#f59e0b';
const NEGATIVE_COLOR_VARIABLE = '--standartRedColor';
const NEGATIVE_FALLBACK_COLOR = '#e74c3c';

@Injectable()
export class CellIconsService {
  private gridColors = inject(GridColorService);

  private iconCache = new Map<string, HTMLCanvasElement>();
  private currentSize = DEFAULT_ICON_SIZE;

  reset(size: number = DEFAULT_ICON_SIZE): void {
    this.currentSize = size;
    this.iconCache.clear();
  }

  getIcon(svgIconName: string, size: number = DEFAULT_ICON_SIZE): HTMLCanvasElement | undefined {
    const cacheKey = `${svgIconName}_${size}`;

    if (!this.iconCache.has(cacheKey)) {
      const svgString = this.getSvgForIcon(svgIconName);
      if (svgString) {
        const canvas = this.createFromSvg(svgString, size);
        this.iconCache.set(cacheKey, canvas);
      }
    }

    return this.iconCache.get(cacheKey);
  }

  private getSvgForIcon(iconName: string): string | undefined {
    const color = this.gridColors.mainFontColor;

    switch (iconName) {
      case 'pp-icon-container':
        return IconBoxContainerComponent.getSvg(color);
      case 'pp-icon-in-container':
        return IconInContainerComponent.getSvg(color);
      case 'pp-icon-pencil':
        return IconPencilComponent.getSvg(color);
      case WORK_CONFIRMED_ICON:
        return IconWorkConfirmedComponent.getSvg(this.themeColor(POSITIVE_COLOR_VARIABLE, POSITIVE_FALLBACK_COLOR));
      case WORK_APPROVED_ICON:
        return IconWorkApprovedComponent.getSvg(this.themeColor(WARNING_COLOR_VARIABLE, WARNING_FALLBACK_COLOR));
      case WORK_CLOSED_ICON:
        return IconWorkClosedComponent.getSvg(this.themeColor(NEGATIVE_COLOR_VARIABLE, NEGATIVE_FALLBACK_COLOR));
      case WORK_MOVED_ICON:
        return IconWorkMovedComponent.getSvg(color);
      default:
        return undefined;
    }
  }

  private themeColor(variable: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return value || fallback;
  }

  private createFromSvg(svgString: string, size: number): HTMLCanvasElement {
    return DrawHelper.createCanvasFromSvgStringSync(
      svgString,
      size,
      size,
      () => {}
    );
  }
}
