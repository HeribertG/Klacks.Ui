// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WhisperModelAliases } from 'src/app/domain/constants/whisper-model-aliases.constants';
import { isParakeetCoveredLanguage, resolveDefaultLocalSttAlias } from './local-stt-default-alias.helper';

const DOCKER_ALIASES = [WhisperModelAliases.Parakeet, WhisperModelAliases.Small, WhisperModelAliases.LargeV3Turbo];
const NATIVE_ALIASES = [WhisperModelAliases.Parakeet];
const PARAKEET_LANGUAGES = ['de', 'en', 'fr', 'it'];

describe('resolveDefaultLocalSttAlias', () => {
  it('picks Parakeet on Docker for a covered language', () => {
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, PARAKEET_LANGUAGES, 'de')).toBe(WhisperModelAliases.Parakeet);
  });

  it('ignores the region suffix and the case of the installation language', () => {
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, PARAKEET_LANGUAGES, 'de-CH')).toBe(WhisperModelAliases.Parakeet);
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, PARAKEET_LANGUAGES, 'FR-ca')).toBe(WhisperModelAliases.Parakeet);
  });

  it('picks Whisper large-v3-turbo on Docker for an uncovered language', () => {
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, PARAKEET_LANGUAGES, 'ja')).toBe(WhisperModelAliases.LargeV3Turbo);
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, PARAKEET_LANGUAGES, 'ja-JP')).toBe(
      WhisperModelAliases.LargeV3Turbo,
    );
  });

  it('always picks Parakeet on a native installation', () => {
    expect(resolveDefaultLocalSttAlias(NATIVE_ALIASES, PARAKEET_LANGUAGES, 'ja')).toBe(WhisperModelAliases.Parakeet);
  });

  it('counts a blank or unknown installation language as covered', () => {
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, PARAKEET_LANGUAGES, '')).toBe(WhisperModelAliases.Parakeet);
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, PARAKEET_LANGUAGES, '   ')).toBe(WhisperModelAliases.Parakeet);
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, PARAKEET_LANGUAGES, null)).toBe(WhisperModelAliases.Parakeet);
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, PARAKEET_LANGUAGES, undefined)).toBe(
      WhisperModelAliases.Parakeet,
    );
  });

  it('keeps Parakeet when the Api reports no coverage list', () => {
    expect(resolveDefaultLocalSttAlias(DOCKER_ALIASES, undefined, 'ja')).toBe(WhisperModelAliases.Parakeet);
  });

  it('falls back to Whisper large-v3-turbo when Parakeet is not supported', () => {
    expect(
      resolveDefaultLocalSttAlias([WhisperModelAliases.Small, WhisperModelAliases.LargeV3Turbo], PARAKEET_LANGUAGES, 'de'),
    ).toBe(WhisperModelAliases.LargeV3Turbo);
  });

  it('exposes the coverage check on its own', () => {
    expect(isParakeetCoveredLanguage(PARAKEET_LANGUAGES, 'it')).toBe(true);
    expect(isParakeetCoveredLanguage(PARAKEET_LANGUAGES, 'ko')).toBe(false);
  });
});
