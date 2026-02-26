// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';
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

  onSelectEmail(email: IReceivedEmailListItem): void {
    this.inboxService.selectEmail(email.id);
  }

  onRefresh(): void {
    this.inboxService.loadEmails();
  }

  isSelected(email: IReceivedEmailListItem): boolean {
    return this.inboxService.selectedEmail()?.id === email.id;
  }

  getDisplayName(email: IReceivedEmailListItem): string {
    return email.fromName || email.fromAddress;
  }
}
