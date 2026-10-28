// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  PLAYGROUND_DEVICE_TOKEN_MAX_LENGTH,
  PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE,
  PLAYGROUND_FEATURE_BLOCKED_I18N_KEY,
  PLAYGROUND_PROMPT_REJECTED_I18N_KEY,
  PLAYGROUND_PROMPT_TOO_LONG_ERROR_CODE,
  PLAYGROUND_TOKEN_LIMIT_ERROR_CODE,
  PLAYGROUND_TOKEN_LIMIT_I18N_KEY,
} from 'src/app/domain/constants/playground.constants';
import {
  isPlausiblePlaygroundDeviceToken,
  isPlaygroundLlmUrl,
  isPlaygroundStatusUnknownError,
  playgroundErrorI18nKey,
  playgroundHttpErrorI18nKey,
} from './playground-token-limit.helper';

const API_BASE = 'https://api.example.com/api/backend/';
const PAGE_ORIGIN = 'https://app.example.com';
const VALID_TOKEN = 'CfDJ8Abc_def-GHI1234567890';

describe('playground token limit helper', () => {
  describe('playgroundErrorI18nKey', () => {
    it.each([
      [PLAYGROUND_TOKEN_LIMIT_ERROR_CODE, PLAYGROUND_TOKEN_LIMIT_I18N_KEY],
      [PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE, PLAYGROUND_FEATURE_BLOCKED_I18N_KEY],
      [PLAYGROUND_PROMPT_TOO_LONG_ERROR_CODE, PLAYGROUND_PROMPT_REJECTED_I18N_KEY],
    ])('maps %s to its message key', (code, key) => {
      expect(playgroundErrorI18nKey(code)).toBe(key);
    });

    it.each(['playground_token_limit', 'OTHER', undefined, null, 429])('knows nothing about %j', (code) => {
      expect(playgroundErrorI18nKey(code)).toBeNull();
    });
  });

  describe('playgroundHttpErrorI18nKey', () => {
    it.each([
      [429, PLAYGROUND_TOKEN_LIMIT_ERROR_CODE, PLAYGROUND_TOKEN_LIMIT_I18N_KEY],
      [403, PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE, PLAYGROUND_FEATURE_BLOCKED_I18N_KEY],
      [400, PLAYGROUND_PROMPT_TOO_LONG_ERROR_CODE, PLAYGROUND_PROMPT_REJECTED_I18N_KEY],
    ])('recognises %s with %s', (status, code, key) => {
      expect(playgroundHttpErrorI18nKey(status, code)).toBe(key);
    });

    it.each([
      [500, PLAYGROUND_TOKEN_LIMIT_ERROR_CODE],
      [400, PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE],
      [429, 'OTHER'],
      [429, undefined],
    ])('rejects status %s with code %s', (status, code) => {
      expect(playgroundHttpErrorI18nKey(status, code)).toBeNull();
    });
  });

  describe('isPlaygroundStatusUnknownError', () => {
    it.each([0, 500, 502, 503, 504])('treats HTTP status %s as unknown', (status) => {
      expect(isPlaygroundStatusUnknownError({ status })).toBe(true);
    });

    it.each([400, 401, 403, 404, 429])('treats HTTP status %s as a final answer', (status) => {
      expect(isPlaygroundStatusUnknownError({ status })).toBe(false);
    });

    it.each([new Error('timeout'), null, undefined, 'failure'])('treats %j without a status as unknown', (error) => {
      expect(isPlaygroundStatusUnknownError(error)).toBe(true);
    });
  });

  describe('isPlausiblePlaygroundDeviceToken', () => {
    it('accepts a base64url token', () => {
      expect(isPlausiblePlaygroundDeviceToken(VALID_TOKEN)).toBe(true);
    });

    it.each([
      '',
      'short',
      null,
      undefined,
      42,
      'has spaces in the token 1234567890',
      'line\nbreak1234567890123',
      'dots.are.not.base64url.12345',
      'x'.repeat(PLAYGROUND_DEVICE_TOKEN_MAX_LENGTH + 1),
    ])('rejects %j', (token) => {
      expect(isPlausiblePlaygroundDeviceToken(token)).toBe(false);
    });
  });

  describe('isPlaygroundLlmUrl', () => {
    it.each([
      'https://api.example.com/api/backend/assistant/chat/execute-function',
      'https://api.example.com/api/backend/assistant/chat/welcome?lang=de',
      'https://api.example.com/api/backend/assistant/transcription/enhance',
      'https://api.example.com/api/backend/assistant/plans',
      'https://api.example.com/api/backend/assistant/goal-candidates/next',
    ])('carries the token on %s', (url) => {
      expect(isPlaygroundLlmUrl(url, API_BASE, PAGE_ORIGIN)).toBe(true);
    });

    it.each([
      'https://api.example.com/api/backend/Playground/Status',
      'https://api.example.com/api/backend/assistant/providers',
      'https://api.example.com/api/backend/assistant/chatty',
      'https://api.example.com/api/backend/Clients/1',
      'https://api.example.com/api/backend/assistant/agents?x=/chat/y',
      'https://api.example.com/api/backend/assistant/stt/transcribe',
      'https://api.example.com/api/backend/assistant/tts/synthesize',
    ])('does not carry the token on %s', (url) => {
      expect(isPlaygroundLlmUrl(url, API_BASE, PAGE_ORIGIN)).toBe(false);
    });

    it.each([
      'https://evil.example.org/api/backend/assistant/chat',
      '//evil.example.org/api/backend/assistant/chat',
      'https://api.example.com.evil.org/api/backend/assistant/chat',
      'http://api.example.com/api/backend/assistant/chat',
      'https://api.example.com/other/assistant/chat',
      '/api/backend/assistant/chat',
    ])('never sends the token to the foreign or mismatching address %s', (url) => {
      expect(isPlaygroundLlmUrl(url, API_BASE, PAGE_ORIGIN)).toBe(false);
    });

    it('resolves relative URLs against a relative API base on the page origin', () => {
      expect(isPlaygroundLlmUrl('/api/backend/assistant/chat', '/api/backend/', PAGE_ORIGIN)).toBe(true);
      expect(isPlaygroundLlmUrl('//evil.example.org/api/backend/assistant/chat', '/api/backend/', PAGE_ORIGIN)).toBe(
        false,
      );
    });

    it('treats an unparsable URL as foreign', () => {
      expect(isPlaygroundLlmUrl('http://', API_BASE, PAGE_ORIGIN)).toBe(false);
    });
  });
});
