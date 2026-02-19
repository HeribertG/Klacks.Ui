export interface IConstraintViolation {
  type: 'hard' | 'soft';
  agentId: string;
  description: string;
}
