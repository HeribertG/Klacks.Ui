// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToastsContainerComponent } from './toast.component';
import { ToastService } from './toast.service';
import { ToastShowService } from './toast-show.service';

describe('ToastsContainerComponent', () => {
  let fixture: ComponentFixture<ToastsContainerComponent>;
  let toastService: ToastService;
  let toastShowService: ToastShowService;

  const UNDO_DELAY_MS = 15000;

  beforeEach(async () => {
    // Arrange
    await TestBed.configureTestingModule({
      imports: [ToastsContainerComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastsContainerComponent);
    toastService = TestBed.inject(ToastService);
    toastShowService = TestBed.inject(ToastShowService);
  });

  it('should render an undo button with the configured label', () => {
    // Arrange
    toastShowService.showUndo('Shift deleted\nAnna Muster, 2025-01-15', 'Undo', vi.fn(), UNDO_DELAY_MS);

    // Act
    fixture.detectChanges();

    // Assert
    const button: HTMLButtonElement | null = fixture.nativeElement.querySelector('.undo-btn');
    expect(button).toBeTruthy();
    expect(button?.type).toBe('button');
    expect(button?.textContent?.trim()).toContain('Undo');
    expect(button?.querySelector('svg')).toBeTruthy();
  });

  it('should bind the remaining-time bar duration to the toast delay', () => {
    // Arrange
    toastShowService.showUndo('Shift deleted\nAnna Muster, 2025-01-15', 'Undo', vi.fn(), UNDO_DELAY_MS);

    // Act
    fixture.detectChanges();

    // Assert
    const bar: HTMLElement | null = fixture.nativeElement.querySelector('.undo-progress-bar');
    expect(bar?.style.animationDuration).toBe(`${UNDO_DELAY_MS}ms`);
  });

  it('should invoke onUndo and remove the toast when the undo button is clicked', () => {
    // Arrange
    const onUndo = vi.fn();
    toastShowService.showUndo('Shift deleted\nAnna Muster, 2025-01-15', 'Undo', onUndo, UNDO_DELAY_MS);
    fixture.detectChanges();

    // Act
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.undo-btn');
    button.click();
    fixture.detectChanges();

    // Assert
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(toastService.toasts().length).toBe(0);
    expect(fixture.nativeElement.querySelector('.undo-btn')).toBeNull();
  });

  it('should not render an undo button for a plain toast', () => {
    // Arrange
    toastShowService.showInfo('Plain information');

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.querySelector('.undo-btn')).toBeNull();
  });
});
