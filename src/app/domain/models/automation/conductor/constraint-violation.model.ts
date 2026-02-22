// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IConstraintViolation {
  type: 'hard' | 'soft';
  agentId: string;
  description: string;
}
