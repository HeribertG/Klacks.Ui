// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the local text-to-speech provider (Supertonic 3 in Klacks.Stt): Api endpoints under the assistant base
 * url, the voice id prefix the Api reports, the polling cadence of the install card and every translation key the
 * install card, the licence dialog and the speech settings use for it.
 */
export const LOCAL_TTS_ENDPOINTS = {
  Status: 'tts/local/status',
  License: 'tts/local/license',
  Install: 'tts/local/install',
} as const;

export const LOCAL_TTS_VOICE_PREFIX = 'supertonic:';
export const LOCAL_TTS_FEMALE_VOICE_MARK = 'F';

export const LOCAL_TTS_POLL_INTERVAL_MS = 5000;
export const LOCAL_TTS_MAX_CONSECUTIVE_FAILURES = 3;
export const BYTES_PER_MEGABYTE = 1000 * 1000;

export const LOCAL_TTS_KEYS = {
  PROVIDER: 'setting.speech.tts-local',
  PROVIDER_NOT_INSTALLED: 'setting.speech.tts-local-not-installed',
  COMPUTER_GENERATED: 'setting.speech.tts-computer-generated',
  HEADLINE: 'setting.speech.local-tts.headline',
  DESCRIPTION: 'setting.speech.local-tts.description',
  STATUS_INSTALLED: 'setting.speech.local-tts.status-installed',
  STATUS_NOT_INSTALLED: 'setting.speech.local-tts.status-not-installed',
  STATUS_PENDING: 'setting.speech.local-tts.status-pending',
  STATUS_UNAVAILABLE: 'setting.speech.local-tts.status-unavailable',
  STATUS_RETRY: 'setting.speech.local-tts.status-retry',
  LAST_ERROR: 'setting.speech.local-tts.last-error',
  LICENSE_ACCEPTED: 'setting.speech.local-tts.license-accepted',
  INSTALL: 'setting.speech.local-tts.install',
  RETRY: 'setting.speech.local-tts.retry',
  INSTALL_INVALID_CONSENT: 'setting.speech.local-tts.install-invalid-consent',
  INSTALL_CONFLICT: 'setting.speech.local-tts.install-conflict',
  INSTALL_FAILED: 'setting.speech.local-tts.install-failed',
  DIALOG_TITLE: 'setting.speech.local-tts.dialog-title',
  DIALOG_INTRO: 'setting.speech.local-tts.dialog-intro',
  DIALOG_LOADING: 'setting.speech.local-tts.dialog-loading',
  DIALOG_LOAD_FAILED: 'setting.speech.local-tts.dialog-load-failed',
  DIALOG_CHECKBOX: 'setting.speech.local-tts.dialog-checkbox',
  DIALOG_ACCEPT: 'setting.speech.local-tts.dialog-accept',
  DIALOG_CLOSE: 'setting.speech.local-tts.dialog-close',
  VOICE_FEMALE: 'setting.speech.local-tts.voice-female',
  VOICE_MALE: 'setting.speech.local-tts.voice-male',
  PRIVACY_TITLE: 'setting.speech.privacy-hint.title',
  PRIVACY_TTS: 'setting.speech.privacy-hint.tts',
  PRIVACY_STT: 'setting.speech.privacy-hint.stt',
} as const;
