// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Full proactive governance picture: the master off switch plus one rule per governed finding type.
 * @param killSwitchActive - True pins every finding type back to reporting only
 * @param rules - One entry per governed finding type, defaults included
 */
import { IProactiveGovernanceRule } from './proactive-governance-rule.interface';

export interface IProactiveGovernance {
  killSwitchActive: boolean;
  rules: IProactiveGovernanceRule[];
}
