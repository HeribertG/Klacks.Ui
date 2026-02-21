export const SOUL_SECTION_TYPES = [
  { value: 'identity', label: 'Identity', description: 'Who is the agent? Name, role, purpose' },
  { value: 'personality', label: 'Personality', description: 'Character, humor, behavior' },
  { value: 'tone', label: 'Tone', description: 'Language style, formality, length' },
  { value: 'boundaries', label: 'Boundaries', description: 'What the agent must not do' },
  { value: 'communication_style', label: 'Communication Style', description: 'Formatting, emoji policy, language' },
  { value: 'values', label: 'Values', description: 'Guiding principles, priorities' },
  { value: 'group_behavior', label: 'Group Behavior', description: 'Behavior in groups vs private' },
  { value: 'user_context', label: 'User Context', description: 'User info: name, timezone, role' },
  { value: 'domain_expertise', label: 'Domain Expertise', description: 'Field of expertise, industry knowledge' },
  { value: 'error_handling', label: 'Error Handling', description: 'How to handle errors/unknowns' },
] as const;

export const MEMORY_CATEGORIES = [
  'fact', 'preference', 'decision', 'interaction_summary',
  'user_info', 'project_context', 'learned_behavior',
  'correction', 'temporal', 'user_preference',
  'system_knowledge', 'learned_fact', 'workflow', 'context',
] as const;
