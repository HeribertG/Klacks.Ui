import { TestBed } from '@angular/core/testing';
import { ModalService, ModalType } from './modal.service';
import { firstValueFrom } from 'rxjs';

describe('ModalService', () => {
  let modalService: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ModalService],
    });
    modalService = TestBed.inject(ModalService);
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
