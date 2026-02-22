// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';

export enum ContainerSize {
  NORMAL = '1445px',
  FULL = '100%',
}

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly CONTAINER_ID = 'main_container';

  setContainerSize(size: ContainerSize): void {
    const containerWrapper = document.getElementById(this.CONTAINER_ID);
    if (containerWrapper) {
      containerWrapper.style.setProperty('max-width', size);
    }
  }

  setContainerToNormalSize(): void {
    this.setContainerSize(ContainerSize.NORMAL);
  }

  setContainerToFullSize(): void {
    this.setContainerSize(ContainerSize.FULL);
  }

  setContainerSizeForRoute(url: string): void {
    const fullWidthRoutes = ['absence', 'schedule'];
    const shouldUseFullWidth = fullWidthRoutes.some((route) =>
      url.includes(route)
    );

    if (shouldUseFullWidth) {
      this.setContainerToFullSize();
    } else {
      this.setContainerToNormalSize();
    }
  }
}
