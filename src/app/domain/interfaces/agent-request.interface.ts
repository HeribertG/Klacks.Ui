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
