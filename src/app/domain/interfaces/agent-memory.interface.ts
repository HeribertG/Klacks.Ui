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
