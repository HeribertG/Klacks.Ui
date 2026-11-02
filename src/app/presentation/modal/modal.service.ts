// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ModalType } from './modal-type.enum';
import { filter } from 'rxjs';

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
  private onDismissCallback: (() => void) | null = null;

  openModal(options: {
    type: ModalType;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onDismiss?: () => void;
  }) {
    this.dismissOpenDialog();

    this.deleteMessageTitle = options.title;
    this.deleteMessage = options.message;
    this.deleteMessageOkButton = options.confirmText;
    this.onConfirmCallback = options.onConfirm;
    this.onDismissCallback = options.onDismiss ?? null;

    this.openModel(options.type);
  }

  /** A dialog replaced by a newer one is answered as dismissed, so a caller waiting for its answer never hangs. */
  private dismissOpenDialog(): void {
    const onDismiss = this.onDismissCallback;
    this.onDismissCallback = null;
    onDismiss?.();
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
      this.onDismissCallback = null;
    }
  }

  failedReason(kind: ModalType) {
    this.openModelSignal.set(null);
    this.reasonSignal.set(kind);

    const onDismiss = this.onDismissCallback;
    this.onDismissCallback = null;
    if (onDismiss) {
      this.onConfirmCallback = null;
      onDismiss();
    }
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
