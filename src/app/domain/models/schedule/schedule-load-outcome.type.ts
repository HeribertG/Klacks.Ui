// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SCHEDULE_LOAD_OUTCOME } from 'src/app/domain/constants/schedule-load-completion.constants';

export type ScheduleLoadOutcome = (typeof SCHEDULE_LOAD_OUTCOME)[keyof typeof SCHEDULE_LOAD_OUTCOME];
