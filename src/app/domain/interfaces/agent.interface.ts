export interface IAgent {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createTime: string;
  soulSections?: IAgentSoulSectionSummary[];
  skillCount?: number;
}

export interface IAgentSoulSectionSummary {
  id: string;
  sectionType: string;
  sortOrder: number;
  version: number;
}

export interface IAgentSoulSection {
  id: string;
  sectionType: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
  version: number;
  source?: string;
  createTime: string;
}

export interface IAgentSoulHistory {
  id: string;
  sectionType: string;
  contentBefore?: string;
  contentAfter: string;
  version: number;
  changeType: string;
  changedBy?: string;
  createTime: string;
}

export interface IAgentMemory {
  id: string;
  key: string;
  content: string;
  category: string;
  importance: number;
  isPinned: boolean;
  source: string;
  expiresAt?: string;
  accessCount: number;
  createTime: string;
  score?: number;
}

export interface ICreateAgentRequest {
  name: string;
  displayName?: string;
  description?: string;
}

export interface IUpdateAgentRequest {
  name?: string;
  displayName?: string;
  description?: string;
  isActive?: boolean;
}

export interface IUpsertSoulRequest {
  content: string;
  sortOrder?: number;
}

export interface ICreateMemoryRequest {
  key: string;
  content: string;
  category?: string;
  importance?: number;
  isPinned?: boolean;
  expiresAt?: string;
}

export interface IUpdateMemoryRequest {
  key?: string;
  content?: string;
  category?: string;
  importance?: number;
  isPinned?: boolean;
}

export interface IAgentSkillSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  isEnabled: boolean;
  sortOrder: number;
  executionType: string;
  version: number;
}

export interface IAgentSession {
  id: string;
  sessionId: string;
  title?: string;
  status: string;
  messageCount: number;
  tokenCountEst: number;
  lastMessageAt?: string;
  isArchived: boolean;
}

export interface IAgentSessionMessage {
  id: string;
  role: string;
  content?: string;
  tokenCount?: number;
  modelId?: string;
  functionCalls?: string;
  createTime: string;
}

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
