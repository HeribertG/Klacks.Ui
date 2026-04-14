// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { IconBoxContainerComponent } from 'src/app/presentation/icons/icon-box-container.component';
import { IconInContainerComponent } from 'src/app/presentation/icons/icon-in-container.component';
import { IconPencilComponent } from 'src/app/presentation/icons/icon-pencil.component';
import { DEFAULT_ICON_SIZE } from '../../classes/cell-icon';

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
      default:
        return undefined;
    }
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
