// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Home page component for the Messaging workplace section.
 * Combines the messaging inbox and provider management.
 */

import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { MessagingInboxComponent } from 'src/app/presentation/workplace/settings/messaging-inbox/messaging-inbox.component';

@Component({
  selector: 'app-messaging-home',
  standalone: true,
  imports: [
    TranslateModule,
    MessagingInboxComponent,
  ],
  templateUrl: './messaging-home.component.html',
  styleUrls: ['./messaging-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingHomeComponent implements OnInit {
  private workplaceStateService = inject(WorkplaceStateService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute('messaging');
  }
}
