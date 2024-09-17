import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export enum ModalType {
  Input = 'input',
  Delete = 'delete',
  Message = 'message',
}

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  public openModelEvent = new Subject<ModalType>();
  public resultEvent = new Subject<ModalType>();
  public reasonEvent = new Subject<ModalType>();

  contentInputString: string = '';
  contentInputTitle: string = 'Input';
  contentInputTitleDefault: string = 'Input';
  contentInputOkButton: string = '';
  contentInputOkButtonDefault: string = '';
  deleteMessage: string = '';
  deleteMessageTitle: string = '';
  deleteMessageTitleDefault: string = '';
  deleteMessageOkButton: string = '';
  deleteMessageOkButtonDefault: string = '';
  message: string = '';
  messageTitle: string = '';
  messageTitleDefault: string = '';
  messageOkButton: string = '';
  messageOkButtonDefault: string = '';
  Filing: string = ''; // wird als Ablage benutzt, zB. als Id für Delete

  constructor() {}

  openModel(kind: ModalType) {
    this.openModelEvent.next(kind);
  }

  result(kind: ModalType) {
    this.resultEvent.next(kind);
  }
  failedReason(kind: ModalType) {
    this.reasonEvent.next(kind);
  }

  setDefault(kind: ModalType) {
    switch (kind) {
      case ModalType.Input: {
        this.contentInputTitle = this.contentInputTitleDefault;
        this.contentInputOkButton = this.contentInputOkButtonDefault;
        break;
      }
      case ModalType.Delete: {
        this.deleteMessageTitle = this.deleteMessageTitleDefault;
        this.deleteMessageOkButton = this.deleteMessageOkButtonDefault;
        break;
      }
      case ModalType.Message: {
        this.messageTitle = this.messageTitleDefault;
        this.messageOkButton = this.messageOkButtonDefault;
        break;
      }
    }
  }
}
