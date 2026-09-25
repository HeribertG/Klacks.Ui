// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Wire shapes of the turn-options endpoint (C1): the skills that were offered to the model in the
 * turn a correction is about to refine.
 * @param userMessage - Raw user message of that turn; the backend hashes it, the browser never does
 * @param turnId - Id of that turn; when present the backend finds the turn by it and never by the hash
 * @param skillName - Raw skill name, sent back unchanged as expectedSkill on a correction
 * @param displayName - Label derived from the skill name on the server
 * @param description - Skill description, shown as the option's tooltip
 */
export interface ITurnOptionsRequest {
  userMessage: string;
  turnId?: string;
}

export interface ITurnOption {
  skillName: string;
  displayName: string;
  description: string;
}
