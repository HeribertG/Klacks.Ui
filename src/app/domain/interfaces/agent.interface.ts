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
