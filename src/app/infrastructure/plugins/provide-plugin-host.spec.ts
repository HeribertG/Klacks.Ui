// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { providePluginHost } from './provide-plugin-host';
import { PLUGIN_ASSISTANT_LAUNCHER } from 'klacks-plugin-contracts';
import { PluginSetupAssistantOfferService } from 'src/app/application/services/plugin-setup-assistant-offer.service';

const registrationFor = (token: unknown): unknown =>
  providePluginHost().find((provider) => (provider as { provide?: unknown }).provide === token);

describe('providePluginHost', () => {
  it('binds the plugin assistant launcher token to the generic offer service', () => {
    expect(registrationFor(PLUGIN_ASSISTANT_LAUNCHER)).toEqual({
      provide: PLUGIN_ASSISTANT_LAUNCHER,
      useExisting: PluginSetupAssistantOfferService,
    });
  });
});
