// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PlanStatus } from './agent-plan.interface';

export type PlanStatusValue = (typeof PlanStatus)[keyof typeof PlanStatus];
