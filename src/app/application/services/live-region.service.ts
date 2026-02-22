// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LiveRegionService {
  private renderer: Renderer2 = inject(RendererFactory2).createRenderer(null, null);
  private liveRegion: HTMLElement | null = null;

  private ensureLiveRegion(): HTMLElement {
    if (!this.liveRegion) {
      this.liveRegion = this.renderer.createElement('div');
      this.renderer.setAttribute(this.liveRegion, 'aria-live', 'polite');
      this.renderer.setAttribute(this.liveRegion, 'aria-atomic', 'true');
      this.renderer.addClass(this.liveRegion, 'sr-only');
      this.renderer.appendChild(document.body, this.liveRegion);
    }
    return this.liveRegion!;
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const region = this.ensureLiveRegion();
    this.renderer.setAttribute(region, 'aria-live', priority);

    this.renderer.setProperty(region, 'textContent', '');
    setTimeout(() => {
      this.renderer.setProperty(region, 'textContent', message);
    }, 100);
  }

  clear(): void {
    if (this.liveRegion) {
      this.renderer.setProperty(this.liveRegion, 'textContent', '');
    }
  }
}
