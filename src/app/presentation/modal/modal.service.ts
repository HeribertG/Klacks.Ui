import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export enum ModalType {
  Input = 'input',
  Delete = 'delete',
  Message = 'message',
  Confirmation = 'confirmation',
}

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  public openModelEvent = new Subject<ModalType>();
  public resultEvent = new Subject<ModalType>();
  public reasonEvent = new Subject<ModalType>();

  contentInputString = '';
  contentInputTitle = 'Input';
  contentInputTitleDefault = 'Input';
  contentInputOkButton = '';
  contentInputOkButtonDefault = '';
  deleteMessage = '';
  deleteMessageTitle = '';
  deleteMessageTitleDefault = '';
  deleteMessageOkButton = '';
  deleteMessageOkButtonDefault = '';
  message = '';
  messageTitle = '';
  messageTitleDefault = '';
  messageOkButton = '';
  messageOkButtonDefault = '';
  Filing = ''; // wird als Ablage benutzt, zB. als Id für Delete

  private onConfirmCallback: (() => void) | null = null;

  constructor() {}

  openModal(options: {
    type: ModalType;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  }) {
    // Eigenschaften basierend auf Optionen setzen
    this.deleteMessageTitle = options.title;
    this.deleteMessage = options.message;
    this.deleteMessageOkButton = options.confirmText;
    // Callback für später speichern
    this.onConfirmCallback = options.onConfirm;

    // Das Modal öffnen
    this.openModel(options.type);
  }

  openModel(kind: ModalType) {
    this.openModelEvent.next(kind);
  }

  result(kind: ModalType) {
    this.resultEvent.next(kind);

    // Callback aufrufen, wenn es sich um eine Bestätigung handelt
    if (kind === ModalType.Confirmation && this.onConfirmCallback) {
      this.onConfirmCallback();
      this.onConfirmCallback = null;
    }
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
      case ModalType.Confirmation: {
        // Setze Standardwerte für das Bestätigungsmodal
        this.deleteMessageTitle = this.deleteMessageTitleDefault;
        this.deleteMessageOkButton = this.deleteMessageOkButtonDefault;
        break;
      }
    }
  }
}
