// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure rule that picks the default local speech engine of an installation; mirrors Klacks.Api
 * WhisperPluginConstants.GetDefaultAlias. A native installation (no Whisper alias supported) always gets Parakeet;
 * a Docker installation gets Parakeet when the base code of the installation language (region suffix ignored,
 * case-insensitive) is in the Parakeet coverage list, otherwise Whisper large-v3-turbo. A blank installation language
 * or an unknown coverage list counts as covered.
 * @param supportedAliases - Engine aliases the installation can run
 * @param parakeetLanguages - Base language codes Parakeet can transcribe, undefined when the Api does not report them
 * @param installationLanguage - Installation default language such as 'de' or 'de-CH'; blank or null when unknown
 */
import { LanguageRegionSeparator } from 'src/app/domain/constants/local-stt-plugin.constants';
import { WhisperModelAliases } from 'src/app/domain/constants/whisper-model-aliases.constants';
import { WhisperModelAlias } from 'src/app/domain/models/assistant/whisper-model-alias.type';

export function isParakeetCoveredLanguage(
  parakeetLanguages: readonly string[] | null | undefined,
  installationLanguage: string | null | undefined,
): boolean {
  const baseLanguage = baseLanguageOf(installationLanguage);
  if (!baseLanguage || !parakeetLanguages) {
    return true;
  }
  return parakeetLanguages.some((language) => language.toLowerCase() === baseLanguage);
}

export function resolveDefaultLocalSttAlias(
  supportedAliases: readonly string[],
  parakeetLanguages: readonly string[] | null | undefined,
  installationLanguage: string | null | undefined,
): WhisperModelAlias {
  const supportsParakeet = supportedAliases.includes(WhisperModelAliases.Parakeet);
  const supportsLarge = supportedAliases.includes(WhisperModelAliases.LargeV3Turbo);
  if (!supportsLarge) {
    return WhisperModelAliases.Parakeet;
  }
  if (!supportsParakeet) {
    return WhisperModelAliases.LargeV3Turbo;
  }
  return isParakeetCoveredLanguage(parakeetLanguages, installationLanguage)
    ? WhisperModelAliases.Parakeet
    : WhisperModelAliases.LargeV3Turbo;
}

function baseLanguageOf(language: string | null | undefined): string {
  const trimmed = language?.trim().toLowerCase() ?? '';
  const separatorIndex = trimmed.indexOf(LanguageRegionSeparator);
  return separatorIndex > 0 ? trimmed.slice(0, separatorIndex) : trimmed;
}
