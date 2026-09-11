// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { ToastShowService } from './toast-show.service';
import { ToastService } from './toast.service';
import { BackendAvailabilityService } from 'src/app/application/services/backend-availability.service';
import { ACTION_TOAST } from './action-toast.constants';

const ACTION_TOAST_NAME = 'app-reload';

describe('ToastShowService', () => {
  let service: ToastShowService;
  let toastService: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastShowService);
    toastService = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('showSuccess', () => {
    it('should create a success toast with correct styling', () => {
      service.showSuccess('Operation completed', 'Success');

      const toasts = toastService.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].textOrTpl).toBe('Operation completed');
      expect(toasts[0].classname).toBe('bg-success text-light');
      expect(toasts[0].delay).toBe(2000);
      expect(toasts[0].headertext).toBe('Success');
      expect(toasts[0].autohide).toBe(true);
    });

    it('should include additional message when provided', () => {
      service.showSuccess('Done', 'OK', 'Extra details');

      const toast = toastService.toasts()[0];
      expect(toast.showTextField).toBe(true);
      expect(toast.textFieldValue).toBe('Extra details');
    });
  });

  describe('showError', () => {
    it('should create an error toast with correct styling', () => {
      service.showError('Something failed', 'ERROR_NAME');

      const toasts = toastService.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].textOrTpl).toBe('Something failed');
      expect(toasts[0].classname).toBe('bg-danger text-light');
      expect(toasts[0].delay).toBe(8000);
    });

    it('should replace existing error with same name', () => {
      service.showError('First error', 'SAME_NAME');
      service.showError('Second error', 'SAME_NAME');

      const toasts = toastService.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].textOrTpl).toBe('Second error');
    });

    it('should include error details when provided', () => {
      service.showError('Failed', 'ERR', 'Stack trace here');

      const toast = toastService.toasts()[0];
      expect(toast.showTextField).toBe(true);
      expect(toast.textFieldValue).toBe('Stack trace here');
    });
  });

  describe('showInfo', () => {
    it('should create an info toast with correct styling', () => {
      service.showInfo('Information message', 'INFO_NAME');

      const toasts = toastService.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].textOrTpl).toBe('Information message');
      expect(toasts[0].classname).toBe('bg-info text-light');
      expect(toasts[0].delay).toBe(5000);
      expect(toasts[0].headertext).toBe('Info');
    });

    it('should replace existing info with same name', () => {
      service.showInfo('First info', 'SAME');
      service.showInfo('Second info', 'SAME');

      const toasts = toastService.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].textOrTpl).toBe('Second info');
    });
  });

  describe('showUndo', () => {
    it('should create an undo toast with undo styling, delay and config', () => {
      // Arrange
      const onUndo = vi.fn();

      // Act
      service.showUndo('Shift deleted\nAnna Muster, 2025-01-15', 'Undo', onUndo, 15000);

      // Assert
      const toasts = toastService.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].classname).toBe('bg-undo');
      expect(toasts[0].delay).toBe(15000);
      expect(toasts[0].autohide).toBe(true);
      expect(toasts[0].headertext).toBe('');
      expect(toasts[0].icon).toBe('');
      expect(toasts[0].undo?.label).toBe('Undo');
      expect(toasts[0].undo?.onUndo).toBe(onUndo);
    });

    it('should replace a previous undo toast instead of stacking offers', () => {
      // Arrange
      service.showUndo('Shift deleted\nAnna Muster, 2025-01-15', 'Undo', vi.fn(), 15000);

      // Act
      service.showUndo('Shift deleted\nBeat Meier, 2025-01-16', 'Undo', vi.fn(), 15000);

      // Assert
      const toasts = toastService.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].textOrTpl).toBe('Shift deleted\nBeat Meier, 2025-01-16');
    });

    it('should still show the second undo offer when the text is identical', () => {
      // Arrange
      service.showUndo('Shift deleted\nAnna Muster, 2025-01-15', 'Undo', vi.fn(), 15000);
      const second = vi.fn();

      // Act
      service.showUndo('Shift deleted\nAnna Muster, 2025-01-15', 'Undo', second, 15000);

      // Assert
      const toasts = toastService.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].undo?.onUndo).toBe(second);
    });
  });

  describe('interactive replies', () => {
    const config = {
      prompt: 'Please choose',
      options: [{ label: 'Save anyway', value: '__save_anyway__' }],
      selectionMode: 'single' as const,
    };

    it('should create an interactive toast', () => {
      service.showInteractiveReply(config, () => undefined);

      const toasts = toastService.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].interactive).toBeTruthy();
      expect(toasts[0].persistent).toBeFalsy();
    });

    it('dismissInteractiveReplies should remove a non-persistent interactive toast', () => {
      service.showInteractiveReply(config, () => undefined);
      expect(toastService.toasts().length).toBe(1);

      service.dismissInteractiveReplies();
      expect(toastService.toasts().length).toBe(0);
    });

    it('dismissInteractiveReplies must NOT remove a persistent interactive toast', () => {
      service.showInteractiveReply(config, () => undefined, undefined, true);
      const toast = toastService.toasts()[0];
      expect(toast.persistent).toBe(true);

      service.dismissInteractiveReplies();

      expect(toastService.toasts().length).toBe(1);
      expect(toastService.toasts()[0].persistent).toBe(true);
    });
  });

  describe('signal reactivity', () => {
    it('should trigger signal update on showSuccess', () => {
      const before = toastService.toasts();
      service.showSuccess('Test', 'Header');
      const after = toastService.toasts();

      expect(before).not.toBe(after);
      expect(after.length).toBe(1);
    });

    it('should trigger signal update on showError', () => {
      const before = toastService.toasts();
      service.showError('Error', 'ERR');
      const after = toastService.toasts();

      expect(before).not.toBe(after);
      expect(after.length).toBe(1);
    });

    it('should trigger signal update on showInfo', () => {
      const before = toastService.toasts();
      service.showInfo('Info');
      const after = toastService.toasts();

      expect(before).not.toBe(after);
      expect(after.length).toBe(1);
    });
  });

  describe('during a suspected backend outage', () => {
    beforeEach(() => {
      const backendAvailability = TestBed.inject(BackendAvailabilityService);
      vi.spyOn(backendAvailability, 'isOutageSuspected').mockReturnValue(true);
    });

    it('should swallow error toasts', () => {
      service.showError('Something failed', 'ERROR_NAME');

      expect(toastService.toasts().length).toBe(0);
    });

    it('should still show info toasts', () => {
      service.showInfo('Information message', 'INFO_NAME');

      expect(toastService.toasts().length).toBe(1);
    });

    it('should still show success toasts', () => {
      service.showSuccess('Operation completed', 'Success');

      expect(toastService.toasts().length).toBe(1);
    });

    it('should still show action toasts', () => {
      service.showActions('New version available', ACTION_TOAST_NAME, [{ label: 'Now', onClick: vi.fn() }]);

      expect(toastService.toasts().length).toBe(1);
    });
  });

  describe('showActions', () => {
    it('should create a toast that stays until one of its actions is chosen', () => {
      const actions = [
        { label: 'Now', onClick: vi.fn() },
        { label: 'Later', onClick: vi.fn() },
      ];

      const toast = service.showActions('New version available', ACTION_TOAST_NAME, actions);

      expect(toast).not.toBeNull();
      expect(toastService.toasts()[0]).toMatchObject({
        textOrTpl: 'New version available',
        name: ACTION_TOAST_NAME,
        autohide: false,
        classname: ACTION_TOAST.CLASSNAME,
      });
      expect(toastService.toasts()[0].actions).toBe(actions);
    });

    it('should replace an earlier action toast with the same name', () => {
      service.showActions('New version available', ACTION_TOAST_NAME, [{ label: 'Now', onClick: vi.fn() }]);
      service.showActions('Connection restored', ACTION_TOAST_NAME, [{ label: 'Now', onClick: vi.fn() }]);

      expect(toastService.toasts().length).toBe(1);
      expect(toastService.toasts()[0].textOrTpl).toBe('Connection restored');
    });
  });

  describe('updateText', () => {
    it('should change the text of a shown toast', () => {
      const toast = service.showActions('Reloading in 10 s', ACTION_TOAST_NAME, [])!;

      service.updateText(toast, 'Reloading in 9 s');

      expect(toastService.toasts()[0].textOrTpl).toBe('Reloading in 9 s');
    });
  });

  describe('dismiss', () => {
    it('should remove the given toast', () => {
      const toast = service.showActions('New version available', ACTION_TOAST_NAME, [])!;

      service.dismiss(toast);

      expect(toastService.toasts().length).toBe(0);
    });
  });
});
