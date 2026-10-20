// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Directive that enables an NgbTooltip only while the host element's text is visually truncated.
 * Apply it together with ngbTooltip on an element styled with overflow hidden and an ellipsis.
 */
import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

@Directive({
  selector: '[ngbTooltip][appTruncatedTooltip]',
  standalone: true,
})
export class TruncatedTooltipDirective {
  private readonly tooltip = inject(NgbTooltip);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  @HostListener('pointerenter')
  updateTooltipState(): void {
    this.tooltip.disableTooltip = this.element.scrollWidth <= this.element.clientWidth;
  }
}
