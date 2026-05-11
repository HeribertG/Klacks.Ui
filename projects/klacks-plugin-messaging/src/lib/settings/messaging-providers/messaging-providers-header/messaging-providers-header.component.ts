// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Header row component for the messaging providers table.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-messaging-providers-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './messaging-providers-header.component.html',
  styleUrls: ['./messaging-providers-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingProvidersHeaderComponent {
}
