// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Stub for the upcoming Klacksy transcript overlay (full implementation in Task 6).
 * Renders nothing; exists only so VoiceShellComponent can resolve its import / template usage.
 * @param messages - Conversation messages to display once the overlay is implemented
 * @param closed - Emits when the overlay requests to be dismissed
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-transcript-overlay',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptOverlayComponent {
  readonly messages = input<readonly unknown[]>([]);
  readonly closed = output<void>();
}
