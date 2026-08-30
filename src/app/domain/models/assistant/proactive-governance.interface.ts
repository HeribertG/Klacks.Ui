// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Full proactive governance picture: the global autonomy level, the master off switch plus one rule per governed finding type.
 * @param globalAutonomyLevel - Global autonomy level (0–3) chosen by the administrator
 * @param globalAutonomyCap - Ceiling the global level imposes on every rule: 0 report only, 1 prepare, 2 carry out
 * @param killSwitchActive - True pins every finding type back to reporting only
 * @param rules - One entry per governed finding type, defaults included
 */
import { IProactiveGovernanceRule } from './proactive-governance-rule.interface';

export interface IProactiveGovernance {
  globalAutonomyLevel: number;
  globalAutonomyCap: number;
  killSwitchActive: boolean;
  rules: IProactiveGovernanceRule[];
}
