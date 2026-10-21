// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The chat input of one assistant chat instance: the text in the box and the send action. Tour,
 * reply toasts and the voice orchestrator submit text through here, so none of them depends on
 * the stream service that performs the send.
 * @param sender - Sends the current input text as a turn; registered by the stream service
 */
import { Injectable, signal } from '@angular/core';

@Injectable()
export class ChatComposerService {
  readonly inputText = signal('');
  private sender: () => Promise<void> = () => Promise.resolve();

  registerSender(sender: () => Promise<void>): void {
    this.sender = sender;
  }

  send(): Promise<void> {
    return this.sender();
  }

  /**
   * Puts the text into the input box and sends it, exactly as if the user had typed it.
   * @param text - Text to send
   */
  submit(text: string): Promise<void> {
    this.inputText.set(text);
    return this.send();
  }
}
