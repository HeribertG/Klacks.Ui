// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IAgentPhysiology } from './agent-physiology.model';
import { IAgentPsychology } from './agent-psychology.model';

export interface IAgentState {
  physiology: IAgentPhysiology;
  psychology: IAgentPsychology;
  motivation: number;
}
