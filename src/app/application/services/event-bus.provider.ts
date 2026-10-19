// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Binds EVENT_BUS_TOKEN to the root EventBus instance instead of a second one: services emit through the
 * token while the domain event handler (toasts, navigation) listens on EventBus, so both must be the same bus.
 */

import { Provider } from '@angular/core';
import { EVENT_BUS_TOKEN } from '../../domain/interfaces/event-bus.interface';
import { EventBus } from './event-bus.service';

export const EVENT_BUS_PROVIDER: Provider = { provide: EVENT_BUS_TOKEN, useExisting: EventBus };
