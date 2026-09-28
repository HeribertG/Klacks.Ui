// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAgentPhysiology } from './agent-physiology.model';
import { IAgentPsychology } from './agent-psychology.model';

export interface IAgentState {
  physiology: IAgentPhysiology;
  psychology: IAgentPsychology;
  motivation: number;
}
