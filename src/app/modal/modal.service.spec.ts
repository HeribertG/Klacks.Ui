import { ModalService, ModalType } from './modal.service';

describe('ModalService', () => {
  let modalService: ModalService;

  beforeEach(() => {
    modalService = new ModalService();
  });

  it('should be created', () => {
    expect(modalService).toBeTruthy();
  });

  it('should emit openModelEvent when openModel is called', () => {
    const modalType = ModalType.Input;
    let emittedModalType: ModalType | undefined;

    modalService.openModelEvent.subscribe((type) => {
      emittedModalType = type;
    });

    modalService.openModel(modalType);

    expect(emittedModalType).toBe(modalType);
  });

  it('should emit resultEvent when result is called', () => {
    const modalType = ModalType.Delete;
    let emittedModalType: ModalType | undefined;

    modalService.resultEvent.subscribe((type) => {
      emittedModalType = type;
    });

    modalService.result(modalType);

    expect(emittedModalType).toBe(modalType);
  });

  it('should emit reasonEvent when reason is called', () => {
    const modalType = ModalType.Message;
    let emittedModalType: ModalType | undefined;

    modalService.reasonEvent.subscribe((type) => {
      emittedModalType = type;
    });

    modalService.failedReason(modalType);

    expect(emittedModalType).toBe(modalType);
  });

  it('should set default values for Input modal', () => {
    const modalType = ModalType.Input;
    modalService.setDefault(modalType);

    expect(modalService.contentInputTitle).toBe(
      modalService.contentInputTitleDefault
    );
    expect(modalService.contentInputOkButton).toBe(
      modalService.contentInputOkButtonDefault
    );
  });

  it('should set default values for Delete modal', () => {
    const modalType = ModalType.Delete;
    modalService.setDefault(modalType);

    expect(modalService.deleteMessageTitle).toBe(
      modalService.deleteMessageTitleDefault
    );
    expect(modalService.deleteMessageOkButton).toBe(
      modalService.deleteMessageOkButtonDefault
    );
  });

  it('should set default values for Message modal', () => {
    const modalType = ModalType.Message;
    modalService.setDefault(modalType);

    expect(modalService.messageTitle).toBe(modalService.messageTitleDefault);
    expect(modalService.messageOkButton).toBe(
      modalService.messageOkButtonDefault
    );
  });
});
