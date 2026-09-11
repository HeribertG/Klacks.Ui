// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToastsContainerComponent } from './toast.component';
import { ToastService } from './toast.service';
import { ToastShowService } from './toast-show.service';
import { LiveRegionService } from 'src/app/application/services/live-region.service';

describe('ToastsContainerComponent', () => {
  let fixture: ComponentFixture<ToastsContainerComponent>;
  let toastService: ToastService;
  let toastShowService: ToastShowService;
  let liveRegionService: LiveRegionService;

  const UNDO_DELAY_MS = 15000;

  beforeEach(async () => {
    // Arrange
    await TestBed.configureTestingModule({
      imports: [ToastsContainerComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastsContainerComponent);
    toastService = TestBed.inject(ToastService);
    toastShowService = TestBed.inject(ToastShowService);
    liveRegionService = TestBed.inject(LiveRegionService);
  });

  afterEach(() => {
    // LiveRegionService appends its visually-hidden announcer directly to document.body and is not torn
    // down with the fixture - without this, a leftover announcer from an earlier test would be the one
    // document.body.querySelector('.visually-hidden[aria-live]') finds in a later test.
    document.querySelectorAll('.visually-hidden').forEach((element) => element.remove());
    vi.useRealTimers();
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

  it('should render one button per action and run the chosen action after removing the toast', () => {
    // Arrange
    const later = vi.fn();
    toastShowService.showActions('New version available', 'app-reload', [
      { label: 'Now', onClick: vi.fn() },
      { label: 'Later', onClick: later },
    ]);
    fixture.detectChanges();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.toast-action-btn'));

    // Act
    buttons[1].click();
    fixture.detectChanges();

    // Assert
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Now', 'Later']);
    expect(buttons.every((button) => button.type === 'button')).toBe(true);
    expect(later).toHaveBeenCalledTimes(1);
    expect(toastService.toasts().length).toBe(0);
  });

  it('should show the updated text of an action toast and keep its buttons', () => {
    // Arrange
    const toast = toastShowService.showActions('Reloading in 10 s', 'app-reload', [{ label: 'Now', onClick: vi.fn() }]);
    fixture.detectChanges();
    const buttonBefore: HTMLButtonElement | null = fixture.nativeElement.querySelector('.toast-action-btn');

    // Act
    toastShowService.updateText(toast!, 'Reloading in 9 s');
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.querySelector('.toast-text')?.textContent).toContain('Reloading in 9 s');
    expect(fixture.nativeElement.querySelector('.toast-action-btn')).toBe(buttonBefore);
  });

  it('should not render action buttons for a plain toast', () => {
    // Arrange
    toastShowService.showInfo('Plain information');

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.querySelector('.toast-action-btn')).toBeNull();
  });

  it('should not render the actions container for an empty action list', () => {
    // Arrange
    toastShowService.showActions('No actions here', 'empty-actions', []);

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.querySelector('.toast-actions')).toBeNull();
  });

  it('should mute the live region of an action toast and announce it once instead', () => {
    // Arrange
    const announce = vi.spyOn(liveRegionService, 'announce');
    const toast = toastShowService.showActions('Reloading in 10 s', 'app-reload', [{ label: 'Now', onClick: vi.fn() }]);
    fixture.detectChanges();

    // Act
    toastShowService.updateText(toast!, 'Reloading in 9 s');
    fixture.detectChanges();

    // Assert
    const ngbToast: HTMLElement | null = fixture.nativeElement.querySelector('ngb-toast');
    expect(ngbToast?.getAttribute('aria-live')).toBe('off');
    expect(ngbToast?.getAttribute('role')).toBe('status');
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Reloading in 10 s');
  });

  it('should actually place the initial announcement text in the shared live region', async () => {
    // Arrange
    vi.useFakeTimers();
    toastShowService.showActions('Reloading in 10 s', 'app-reload', [{ label: 'Now', onClick: vi.fn() }]);
    fixture.detectChanges();

    // Act
    await vi.advanceTimersByTimeAsync(200);

    // Assert
    const region: HTMLElement | null = document.body.querySelector('.visually-hidden[aria-live]');
    expect(region?.textContent).toBe('Reloading in 10 s');
  });

  it('should keep the default live region for a toast without actions', () => {
    // Arrange
    toastShowService.showInfo('Plain information');

    // Act
    fixture.detectChanges();

    // Assert
    const ngbToast: HTMLElement | null = fixture.nativeElement.querySelector('ngb-toast');
    expect(ngbToast?.getAttribute('aria-live')).toBe('polite');
    expect(ngbToast?.getAttribute('role')).toBe('alert');
  });

  it('should render single-select reply chips for an interactive toast', () => {
    // Arrange
    const onSelected = vi.fn();
    toastShowService.showInteractiveReply({ selectionMode: 'single', options: [{ label: 'Yes', value: 'yes' }] }, onSelected);

    // Act
    fixture.detectChanges();
    const chip: HTMLButtonElement | null = fixture.nativeElement.querySelector('.reply-chip-btn');

    // Assert
    expect(chip?.textContent?.trim()).toBe('Yes');

    // Act
    chip?.click();

    // Assert
    expect(onSelected).toHaveBeenCalledWith(['yes']);
  });
});
