// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Route definitions for the messaging plugin.
 */

import { Routes } from '@angular/router';
import { MessagingHomeComponent } from './components/messaging-home/messaging-home.component';

export const MESSAGING_ROUTES: Routes = [
  { path: '', component: MessagingHomeComponent }
];
