// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, OnInit } from '@angular/core';
import { InboxListComponent } from '../inbox-list/inbox-list.component';
import { InboxDetailComponent } from '../inbox-detail/inbox-detail.component';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-inbox-home',
  templateUrl: './inbox-home.component.html',
  styleUrls: ['./inbox-home.component.scss'],
  standalone: true,
  imports: [InboxListComponent, InboxDetailComponent],
})
export class InboxHomeComponent implements OnInit {
  private inboxService = inject(InboxService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  ngOnInit(): void {
    this.layoutService.setContainerToFullSize();
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(false);
    this.inboxService.loadEmails();
  }
}
