// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { GridCellActionsButtonComponent } from './grid-cell-actions-button.component';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

const CELL = { left: 100, top: 50, width: 40, height: 20 };
const VERTICAL_OFFSET = (TouchInteraction.MinTargetPx - CELL.height) / 2;

const stubBounds = (button: HTMLButtonElement): void => {
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
    left: 300,
    top: 200,
    right: 344,
    bottom: 244,
    width: TouchInteraction.MinTargetPx,
    height: TouchInteraction.MinTargetPx,
    x: 300,
    y: 200,
    toJSON: () => ({}),
  } as DOMRect);
};

describe('GridCellActionsButtonComponent', () => {
  let fixture: ComponentFixture<GridCellActionsButtonComponent>;

  const button = (): HTMLButtonElement | null =>
    fixture.nativeElement.querySelector('button');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridCellActionsButtonComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(GridCellActionsButtonComponent);
  });

  it('renders nothing while the grid is not in touch mode', () => {
    fixture.componentRef.setInput('rect', CELL);
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();

    expect(button()).toBeNull();
  });

  it('renders nothing while no cell is selected', () => {
    fixture.componentRef.setInput('rect', null);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    expect(button()).toBeNull();
  });

  it('places a touch sized button at the trailing edge of the cell, vertically centred on it', () => {
    fixture.componentRef.setInput('rect', CELL);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const element = button() as HTMLButtonElement;
    expect(element.style.left).toBe(`${CELL.left + CELL.width}px`);
    expect(element.style.top).toBe(`${CELL.top - VERTICAL_OFFSET}px`);
    expect(element.style.width).toBe(`${TouchInteraction.MinTargetPx}px`);
    expect(element.style.height).toBe(`${TouchInteraction.MinTargetPx}px`);
  });

  it('announces itself as a menu opener with a translated name', () => {
    fixture.componentRef.setInput('rect', CELL);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const element = button() as HTMLButtonElement;
    expect(element.getAttribute('aria-haspopup')).toBe('menu');
    expect(element.getAttribute('aria-label')).toBe('grid.cellActions');
  });

  it('keeps the button inside the clipped grid box when the cell sits at the trailing edge', () => {
    fixture.componentRef.setInput('rect', { left: 380, top: 50, width: 40, height: 20 });
    fixture.componentRef.setInput('bounds', { width: 400, height: 300 });
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const element = button() as HTMLButtonElement;
    expect(element.style.left).toBe(`${400 - TouchInteraction.MinTargetPx}px`);
  });

  it('never places the button at a negative offset', () => {
    fixture.componentRef.setInput('rect', { left: -90, top: 0, width: 40, height: 20 });
    fixture.componentRef.setInput('bounds', { width: 400, height: 300 });
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const element = button() as HTMLButtonElement;
    expect(element.style.left).toBe('0px');
    expect(element.style.top).toBe('0px');
  });

  it('opens the menu below the button so the finger does not cover it', () => {
    fixture.componentRef.setInput('rect', CELL);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const opened = vi.fn();
    fixture.componentInstance.open.subscribe(opened);
    const element = button() as HTMLButtonElement;
    stubBounds(element);

    element.click();

    expect(opened).toHaveBeenCalledWith({ clientX: 300, clientY: 244 });
  });

  it('stops the click from reaching the document, where the outside-click guard would close the menu again', () => {
    fixture.componentRef.setInput('rect', CELL);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const onDocumentClick = vi.fn();
    document.addEventListener('click', onDocumentClick);
    const element = button() as HTMLButtonElement;
    stubBounds(element);

    try {
      element.click();
    } finally {
      document.removeEventListener('click', onDocumentClick);
    }

    expect(onDocumentClick).not.toHaveBeenCalled();
  });
});
