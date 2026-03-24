// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Route definitions for the messaging plugin.
 */

import { Routes } from '@angular/router';
import { MessagingHomeComponent } from './components/messaging-home/messaging-home.component';

export const MESSAGING_ROUTES: Routes = [
  { path: '', component: MessagingHomeComponent }
];
