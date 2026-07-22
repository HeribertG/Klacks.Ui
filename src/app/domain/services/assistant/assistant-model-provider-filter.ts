// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Filters an assistant model catalog down to models whose provider is enabled and holds a working
 * API key, so pickers never offer a model that would fail at call time.
 * @param models - Full model catalog, possibly including models from disabled or key-less providers
 * @param providers - Currently configured assistant providers
 */
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { IAssistantProvider } from 'src/app/infrastructure/api/assistant/data-assistant-provider.service';

export function filterModelsWithActiveProvider(
  models: IAssistantModel[],
  providers: IAssistantProvider[],
): IAssistantModel[] {
  const activeProviderIds = new Set(
    providers.filter((provider) => provider.isEnabled && provider.hasApiKey).map((provider) => provider.providerId),
  );
  return models.filter((model) => activeProviderIds.has(model.providerId));
}
