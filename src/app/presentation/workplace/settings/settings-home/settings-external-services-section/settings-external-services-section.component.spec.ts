// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { MESSAGING_PLUGIN_NAME } from 'src/app/domain/constants/feature-plugin.constants';
import { SettingsExternalServicesSectionComponent } from './settings-external-services-section.component';

const ALWAYS_SHOWN_IDS = [
  'settings-home-openroute-deepl-row',
  'settings-openroute',
  'settings-deepl',
  'settings-home-web-search-row',
  'settings-web-search',
];

describe('SettingsExternalServicesSectionComponent', () => {
  let isAdmin: boolean;
  let isPluginEnabled: ReturnType<typeof vi.fn>;

  const renderIds = (): string[] => {
    const fixture = TestBed.createComponent(SettingsExternalServicesSectionComponent);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[id]')).map((element) => element.id);
  };

  beforeEach(async () => {
    isAdmin = false;
    isPluginEnabled = vi.fn(() => false);

    await TestBed.configureTestingModule({
      imports: [SettingsExternalServicesSectionComponent],
      providers: [
        {
          provide: AuthorizationService,
          useValue: {
            get isAdmin() {
              return isAdmin;
            },
          },
        },
        { provide: FeaturePluginStateService, useValue: { isPluginEnabled } },
      ],
    })
      .overrideComponent(SettingsExternalServicesSectionComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
  });

  it('shows only the always visible cards for a non-admin without the messaging plugin', () => {
    expect(renderIds()).toEqual(ALWAYS_SHOWN_IDS);
    expect(isPluginEnabled).toHaveBeenCalledWith(MESSAGING_PLUGIN_NAME);
  });

  it('adds the geo services status for an admin and the messaging cards for an enabled messaging plugin', () => {
    isAdmin = true;
    isPluginEnabled.mockReturnValue(true);

    expect(renderIds()).toEqual([
      'settings-home-openroute-deepl-row',
      'settings-openroute',
      'settings-deepl',
      'settings-home-geo-services-row',
      'settings-geo-services-status',
      'settings-home-web-search-row',
      'settings-web-search',
      'settings-home-messaging-providers-row',
      'settings-messaging-providers',
      'settings-home-owner-messengers-row',
      'settings-owner-messengers',
    ]);
  });
});
