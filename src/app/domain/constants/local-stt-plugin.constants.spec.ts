// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pins the plugin provider id of the local speech recognition. It mirrors Klacks.Api WhisperPluginConstants.ProviderId
 * (the well-known custom_stt_providers row): a drift would make the dropdown treat the plugin as a foreign custom server.
 */
import { LocalSttAllAliases, LocalSttEngineNames, LocalSttPlugin } from './local-stt-plugin.constants';
import { SttEngine } from './speech-constants';
import { WhisperModelAliases } from './whisper-model-aliases.constants';

const API_WHISPER_PLUGIN_PROVIDER_ID = '7f3d2a10-0000-4000-8000-57705731a001';

describe('LocalSttPlugin', () => {
  it('mirrors the provider id of Klacks.Api WhisperPluginConstants', () => {
    expect(LocalSttPlugin.ProviderId).toBe(API_WHISPER_PLUGIN_PROVIDER_ID);
  });

  it('derives the persisted engine value from the provider id', () => {
    expect(SttEngine.LocalPluginEngine).toBe(`custom:${API_WHISPER_PLUGIN_PROVIDER_ID}`);
  });

  it('names every alias exactly once', () => {
    expect(Object.keys(LocalSttEngineNames).sort()).toEqual([...LocalSttAllAliases].sort());
    expect(LocalSttEngineNames[WhisperModelAliases.LargeV3Turbo]).toBe('Whisper large-v3-turbo');
  });
});
