// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Transient UI hint emitted by the orchestrator when a non-fatal error occurs.
 * @param kind - Category of error; drives icon visual and tooltip text
 * @param i18nKey - Translation key for the tooltip message
 * @param persistent - If true, UI shows the hint until user dismisses (e.g. permission denied)
 */
export type VoiceShellErrorKind =
  | 'stt-connection'
  | 'stt-empty'
  | 'network'
  | 'mic-permission'
  | 'tts-failure';

export interface IVoiceShellErrorHint {
  readonly kind: VoiceShellErrorKind;
  readonly i18nKey: string;
  readonly persistent: boolean;
}
