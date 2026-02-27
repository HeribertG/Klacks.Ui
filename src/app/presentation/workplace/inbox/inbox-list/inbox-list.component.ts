// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { IReceivedEmailListItem } from 'src/app/domain/models/email/received-email.model';

@Component({
  selector: 'app-inbox-list',
  templateUrl: './inbox-list.component.html',
  styleUrls: ['./inbox-list.component.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe],
})
export class InboxListComponent {
  inboxService = inject(InboxService);

  currentFolderName = computed(() => {
    const selectedImapFolder = this.inboxService.selectedFolder();
    const folder = this.inboxService
      .folders()
      .find((f) => f.imapFolderName === selectedImapFolder);
    return folder?.name ?? 'Inbox';
  });

  onSelectEmail(email: IReceivedEmailListItem): void {
    this.inboxService.selectEmail(email.id);
  }

  onRefresh(): void {
    this.inboxService.fetchAndReload();
  }

  isSelected(email: IReceivedEmailListItem): boolean {
    return this.inboxService.selectedEmail()?.id === email.id;
  }

  getDisplayName(email: IReceivedEmailListItem): string {
    return email.fromName || email.fromAddress;
  }

  onReadFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'all' | 'read' | 'unread';
    this.inboxService.setReadFilter(value);
  }

  onToggleSort(): void {
    this.inboxService.toggleSortDirection();
  }

  onRelevanceFilter(filter: 'all' | 'relevant' | 'other'): void {
    this.inboxService.setRelevanceFilter(filter);
  }
}
