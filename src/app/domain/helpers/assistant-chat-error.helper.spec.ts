// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  LLM_PROVIDER_UNAVAILABLE_ERROR_CODE,
  LLM_PROVIDER_UNAVAILABLE_I18N_KEY,
} from 'src/app/domain/constants/assistant-chat-error.constants';
import {
  PLAYGROUND_TOKEN_LIMIT_ERROR_CODE,
  PLAYGROUND_TOKEN_LIMIT_I18N_KEY,
} from 'src/app/domain/constants/playground.constants';
import { chatErrorI18nKey } from './assistant-chat-error.helper';

describe('chatErrorI18nKey', () => {
  it('maps the provider-unavailable code to its message', () => {
    expect(chatErrorI18nKey(LLM_PROVIDER_UNAVAILABLE_ERROR_CODE)).toBe(LLM_PROVIDER_UNAVAILABLE_I18N_KEY);
  });

  it('still maps the playground codes', () => {
    expect(chatErrorI18nKey(PLAYGROUND_TOKEN_LIMIT_ERROR_CODE)).toBe(PLAYGROUND_TOKEN_LIMIT_I18N_KEY);
  });

  it('returns null for an unknown code or a non-string', () => {
    expect(chatErrorI18nKey('SOMETHING_ELSE')).toBeNull();
    expect(chatErrorI18nKey(undefined)).toBeNull();
    expect(chatErrorI18nKey(42)).toBeNull();
  });
});
