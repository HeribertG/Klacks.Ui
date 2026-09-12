// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Backend processing stages reported by the assistant SSE `status` event while the model has not
 * yet produced any content (assembling the toolset, preparing context, resolving a recipe, calling
 * the model, executing a tool). Kept in one file so the wire contract, the union type and the
 * normalizer that guards against unknown/future stage keys stay in sync.
 */
export const ASSISTANT_STATUS_STAGE = {
  AssemblingToolset: 'assembling_toolset',
  PreparingContext: 'preparing_context',
  ResolvingRecipe: 'resolving_recipe',
  CallingModel: 'calling_model',
  ExecutingTool: 'executing_tool',
  Unknown: 'unknown',
} as const;

export type AssistantStatusStage = (typeof ASSISTANT_STATUS_STAGE)[keyof typeof ASSISTANT_STATUS_STAGE];

const KNOWN_ASSISTANT_STATUS_STAGES: ReadonlySet<string> = new Set(Object.values(ASSISTANT_STATUS_STAGE));

/**
 * Normalizes a raw stage string from the SSE `status` event payload into a known
 * AssistantStatusStage, mapping anything unrecognized (a future backend stage, malformed data) to
 * the Unknown fallback instead of letting it flow further as an untyped string.
 * @param value - The raw `stage` field from the status event payload
 */
export function toAssistantStatusStage(value: string | null | undefined): AssistantStatusStage {
  if (value && KNOWN_ASSISTANT_STATUS_STAGES.has(value)) {
    return value as AssistantStatusStage;
  }
  return ASSISTANT_STATUS_STAGE.Unknown;
}
