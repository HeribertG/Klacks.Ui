// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ModalService } from './modal.service';
import { ModalType } from './modal-type.enum';
import { firstValueFrom } from 'rxjs';

describe('ModalService', () => {
  let modalService: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ModalService],
    });
    modalService = TestBed.inject(ModalService);
  });

  describe('openModal with onDismiss', () => {
    const options = (onConfirm: () => void, onDismiss: () => void) => ({
      type: ModalType.Confirmation,
      title: 'Title',
      message: 'Message',
      confirmText: 'Yes',
      cancelText: 'No',
      onConfirm,
      onDismiss,
    });

    it('answers a dismissed dialog and forgets the confirm, so it cannot fire later', () => {
      const onConfirm = vi.fn();
      const onDismiss = vi.fn();
      modalService.openModal(options(onConfirm, onDismiss));

      modalService.failedReason(ModalType.Confirmation);
      modalService.result(ModalType.Confirmation);

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('answers a dialog replaced by a newer one as dismissed, exactly once', () => {
      const firstDismiss = vi.fn();
      const secondConfirm = vi.fn();
      modalService.openModal(options(vi.fn(), firstDismiss));

      modalService.openModal(options(secondConfirm, vi.fn()));
      modalService.result(ModalType.Confirmation);

      expect(firstDismiss).toHaveBeenCalledTimes(1);
      expect(secondConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not answer a dismiss after the dialog was confirmed', () => {
      const onDismiss = vi.fn();
      modalService.openModal(options(vi.fn(), onDismiss));

      modalService.result(ModalType.Confirmation);
      modalService.failedReason(ModalType.Confirmation);

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('keeps the confirm of a dialog opened without onDismiss across an unrelated dismiss', () => {
      const onConfirm = vi.fn();
      modalService.openModal({ ...options(onConfirm, vi.fn()), onDismiss: undefined });

      modalService.failedReason(ModalType.Input);
      modalService.result(ModalType.Confirmation);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('should be created', () => {
    // Arrange & Act & Assert
    expect(modalService).toBeTruthy();
  });

  it('should update openModelSignal when openModel is called', () => {
    // Arrange
    const modalType = ModalType.Input;

    // Act
    modalService.openModel(modalType);

    // Assert
    expect(modalService.openModelSignal()).toBe(modalType);
  });

  it('should emit openModelEvent when openModel is called', async () => {
    // Arrange
    const modalType = ModalType.Input;
    const eventPromise = firstValueFrom(modalService.openModelEvent);

    // Act
    modalService.openModel(modalType);

    // Assert
    const result = await eventPromise;
    expect(result).toBe(modalType);
  });

  it('should update resultSignal when result is called', () => {
    // Arrange
    const modalType = ModalType.Delete;

    // Act
    modalService.result(modalType);

    // Assert
    expect(modalService.resultSignal()).toBe(modalType);
  });

  it('should emit resultEvent when result is called', async () => {
    // Arrange
    const modalType = ModalType.Delete;
    const eventPromise = firstValueFrom(modalService.resultEvent);

    // Act
    modalService.result(modalType);

    // Assert
    const result = await eventPromise;
    expect(result).toBe(modalType);
  });

  it('should update reasonSignal when failedReason is called', () => {
    // Arrange
    const modalType = ModalType.Message;

    // Act
    modalService.failedReason(modalType);

    // Assert
    expect(modalService.reasonSignal()).toBe(modalType);
  });

  it('emits reasonEvent for every dismissal, also the second dismissal of the same modal type', () => {
    const dismissed: ModalType[] = [];
    modalService.reasonEvent.subscribe((type) => dismissed.push(type));

    modalService.openModel(ModalType.Input);
    TestBed.tick();
    modalService.failedReason(ModalType.Input);
    TestBed.tick();
    modalService.openModel(ModalType.Input);
    TestBed.tick();
    modalService.failedReason(ModalType.Input);
    TestBed.tick();

    expect(dismissed).toEqual([ModalType.Input, ModalType.Input]);
  });

  it('should emit reasonEvent when failedReason is called', async () => {
    // Arrange
    const modalType = ModalType.Message;
    const eventPromise = firstValueFrom(modalService.reasonEvent);

    // Act
    modalService.failedReason(modalType);

    // Assert
    const result = await eventPromise;
    expect(result).toBe(modalType);
  });

  it('should set default values for Input modal', () => {
    // Arrange
    const modalType = ModalType.Input;

    // Act
    modalService.setDefault(modalType);

    // Assert
    expect(modalService.contentInputTitle).toBe(modalService.contentInputTitleDefault);
    expect(modalService.contentInputOkButton).toBe(modalService.contentInputOkButtonDefault);
  });

  it('should set default values for Delete modal', () => {
    // Arrange
    const modalType = ModalType.Delete;

    // Act
    modalService.setDefault(modalType);

    // Assert
    expect(modalService.deleteMessageTitle).toBe(modalService.deleteMessageTitleDefault);
    expect(modalService.deleteMessageOkButton).toBe(modalService.deleteMessageOkButtonDefault);
  });

  it('should set default values for Message modal', () => {
    // Arrange
    const modalType = ModalType.Message;

    // Act
    modalService.setDefault(modalType);

    // Assert
    expect(modalService.messageTitle).toBe(modalService.messageTitleDefault);
    expect(modalService.messageOkButton).toBe(modalService.messageOkButtonDefault);
  });

  it('should execute onConfirmCallback when result is Confirmation', () => {
    // Arrange
    let callbackExecuted = false;
    modalService.openModal({
      type: ModalType.Confirmation,
      title: 'Test',
      message: 'Test message',
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: () => {
        callbackExecuted = true;
      },
    });

    // Act
    modalService.result(ModalType.Confirmation);

    // Assert
    expect(callbackExecuted).toBe(true);
  });
});
