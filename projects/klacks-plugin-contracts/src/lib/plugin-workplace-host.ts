// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Abstraction for host workplace services that plugins need for page integration.
 * @param setActiveManagerByRoute - Notifies the host which plugin page is active
 * @param setContainerToNormalSize - Resets the layout container to default size
 * @param setSearchVisibility - Shows or hides the search bar
 * @param setSavebarVisibility - Shows or hides the save bar
 * @param setClientSearchMode - Enables or disables client search mode
 * @param clientSelected$ - Emits when a client is selected in search
 */

import { Observable } from 'rxjs';
import { IPluginClient } from './plugin-client';

export interface IPluginWorkplaceHost {
  setActiveManagerByRoute(route: string): void;
  setContainerToNormalSize(): void;
  setSearchVisibility(visible: boolean): void;
  setSavebarVisibility(visible: boolean): void;
  setClientSearchMode(enabled: boolean): void;
  clientSelected$: Observable<IPluginClient>;
}
