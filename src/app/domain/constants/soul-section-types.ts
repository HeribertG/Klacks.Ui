// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Section type keys for AgentSoulSection entities.
 * Must match exactly the strings defined in Klacks.Api/Domain/Constants/SoulSectionTypes.cs.
 */
export const SoulSectionTypes = {
  Identity: 'identity',
  Personality: 'personality',
  Tone: 'tone',
  Boundaries: 'boundaries',
  CommunicationStyle: 'communication_style',
  Values: 'values',
  GroupBehavior: 'group_behavior',
  UserContext: 'user_context',
  DomainExpertise: 'domain_expertise',
  ErrorHandling: 'error_handling',
  EmailSetupGuide: 'email_setup_guide',
} as const;

export type SoulSectionType =
  (typeof SoulSectionTypes)[keyof typeof SoulSectionTypes];
