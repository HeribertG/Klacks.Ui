// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Identity and display names of the local (self-hosted) speech recognition plugin.
 * @param ProviderId - Id of the plugin's provider row; mirrors Klacks.Api WhisperPluginConstants.ProviderId
 * @param CardElementId - DOM id of the plugin card in the settings page
 * @param LocalSttEngineNames - Single source of the engine display names shown in the dropdown, status and card
 * @param LanguageRegionSeparator - Separator between base language and region in a language tag such as de-CH
 * @param LocalSttAllAliases - Every engine alias, assumed supported when an older Api does not report supportedAliases
 */
import { WhisperModelAliases } from './whisper-model-aliases.constants';

export const LocalSttPlugin = {
  ProviderId: '7f3d2a10-0000-4000-8000-57705731a001',
  CardElementId: 'settings-whisper-plugin',
} as const;

export const LocalSttEngineNames: Readonly<Record<string, string>> = {
  [WhisperModelAliases.Parakeet]: 'Parakeet',
  [WhisperModelAliases.Small]: 'Whisper small',
  [WhisperModelAliases.LargeV3Turbo]: 'Whisper large-v3-turbo',
};

export const LocalSttAllAliases: readonly string[] = [
  WhisperModelAliases.Parakeet,
  WhisperModelAliases.Small,
  WhisperModelAliases.LargeV3Turbo,
];

export const LanguageRegionSeparator = '-';
