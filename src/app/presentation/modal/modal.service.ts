// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

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
  public openModelSignal = signal<ModalType | null>(null);
  public resultSignal = signal<ModalType | null>(null);
  public reasonSignal = signal<ModalType | null>(null);

  public openModelEvent = toObservable(this.openModelSignal).pipe(
    filter((x): x is ModalType => x !== null)
  );
  public resultEvent = toObservable(this.resultSignal).pipe(
    filter((x): x is ModalType => x !== null)
  );
  public reasonEvent = toObservable(this.reasonSignal).pipe(
    filter((x): x is ModalType => x !== null)
  );

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
  Filing = '';
  componentContext = '';
  private onConfirmCallback: (() => void) | null = null;

  openModal(options: {
    type: ModalType;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  }) {
    this.deleteMessageTitle = options.title;
    this.deleteMessage = options.message;
    this.deleteMessageOkButton = options.confirmText;
    this.onConfirmCallback = options.onConfirm;

    this.openModel(options.type);
  }

  openModel(kind: ModalType) {
    this.resultSignal.set(null);
    this.openModelSignal.set(kind);
  }

  result(kind: ModalType) {
    this.openModelSignal.set(null);
    this.resultSignal.set(kind);

    if ((kind === ModalType.Confirmation || kind === ModalType.Delete) && this.onConfirmCallback) {
      this.onConfirmCallback();
      this.onConfirmCallback = null;
    }
  }

  failedReason(kind: ModalType) {
    this.openModelSignal.set(null);
    this.reasonSignal.set(kind);
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
        this.deleteMessageTitle = this.deleteMessageTitleDefault;
        this.deleteMessageOkButton = this.deleteMessageOkButtonDefault;
        break;
      }
    }
  }
}
