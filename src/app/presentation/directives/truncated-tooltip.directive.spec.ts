// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgbTooltip, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TruncatedTooltipDirective } from './truncated-tooltip.directive';

@Component({
  standalone: true,
  imports: [NgbTooltipModule, TruncatedTooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p id="cell" ngbTooltip="Full text" appTruncatedTooltip>Full text</p>`,
})
class HostComponent {}

describe('TruncatedTooltipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let element: HTMLElement;
  let tooltip: NgbTooltip;

  const setWidths = (scrollWidth: number, clientWidth: number): void => {
    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth });
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const debugElement = fixture.debugElement.query(By.css('#cell'));
    element = debugElement.nativeElement;
    tooltip = debugElement.injector.get(NgbTooltip);
  });

  it('enables the tooltip when the content is wider than the element', () => {
    setWidths(200, 100);
    element.dispatchEvent(new Event('pointerenter'));
    expect(tooltip.disableTooltip).toBe(false);
  });

  it('disables the tooltip when the content fits', () => {
    setWidths(100, 100);
    element.dispatchEvent(new Event('pointerenter'));
    expect(tooltip.disableTooltip).toBe(true);
  });

  it('re-evaluates on every pointer entry', () => {
    setWidths(200, 100);
    element.dispatchEvent(new Event('pointerenter'));
    setWidths(80, 100);
    element.dispatchEvent(new Event('pointerenter'));
    expect(tooltip.disableTooltip).toBe(true);
  });
});
