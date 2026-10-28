// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Transient UI hint emitted by the orchestrator when a non-fatal error occurs.
 * @param kind - Category of error; drives icon visual and tooltip text
 * @param i18nKey - Translation key for the tooltip message
 * @param persistent - If true, UI shows the hint until user dismisses (e.g. permission denied)
 * @param severity - Set to the info severity for a hint that only informs; absent means the hint reports a failure
 */
import type { VOICE_HINT_SEVERITY_INFO } from 'src/app/domain/constants/voice-shell-error-hint.constants';

export type VoiceShellErrorKind =
  | 'stt-connection'
  | 'stt-empty'
  | 'network'
  | 'mic-permission'
  | 'tts-failure'
  | 'playground-limit';

export interface IVoiceShellErrorHint {
  readonly kind: VoiceShellErrorKind;
  readonly i18nKey: string;
  readonly persistent: boolean;
  readonly severity?: typeof VOICE_HINT_SEVERITY_INFO;
}
