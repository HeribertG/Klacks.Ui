// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * External services section of the expert settings page: the rows with the OpenRouteService, DeepL and web search cards,
 * the geo services status for admins and the messaging provider and owner messenger cards while the messaging plugin is enabled.
 * @param authorizationService - Decides whether the admin-only geo services status is shown
 * @param featurePluginState - Decides whether the messaging plugin cards are shown
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MessagingProvidersComponent, OwnerMessengersComponent } from 'klacks-plugin-messaging';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { MESSAGING_PLUGIN_NAME } from 'src/app/domain/constants/feature-plugin.constants';
import { OpenrouteComponent } from '../../openroute/openroute.component';
import { DeeplComponent } from '../../deepl/deepl.component';
import { GeoServicesStatusComponent } from '../../geo-services-status/geo-services-status.component';
import { WebSearchComponent } from '../../web-search/web-search.component';

@Component({
  selector: 'app-settings-external-services-section',
  templateUrl: './settings-external-services-section.component.html',
  styleUrl: './settings-external-services-section.component.scss',
  standalone: true,
  imports: [
    OpenrouteComponent,
    DeeplComponent,
    GeoServicesStatusComponent,
    WebSearchComponent,
    MessagingProvidersComponent,
    OwnerMessengersComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsExternalServicesSectionComponent {
  protected readonly authorizationService = inject(AuthorizationService);
  protected readonly featurePluginState = inject(FeaturePluginStateService);
  protected readonly messagingPluginName = MESSAGING_PLUGIN_NAME;
}
