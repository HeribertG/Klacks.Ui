// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { DataReceivedEmailService } from 'src/app/infrastructure/api/email/data-received-email.service';
import {
  IReceivedEmail,
  IReceivedEmailListItem,
} from 'src/app/domain/models/email/received-email.model';

const DEFAULT_PAGE_SIZE = 50;

@Injectable({
  providedIn: 'root',
})
export class InboxService {
  private dataReceivedEmailService = inject(DataReceivedEmailService);

  emails = signal<IReceivedEmailListItem[]>([]);
  selectedEmail = signal<IReceivedEmail | undefined>(undefined);
  unreadCount = signal<number>(0);
  totalCount = signal<number>(0);
  isLoading = signal<boolean>(false);

  loadEmails(skip = 0, take = DEFAULT_PAGE_SIZE): void {
    this.isLoading.set(true);
    this.dataReceivedEmailService.getList(skip, take).subscribe({
      next: (response) => {
        this.emails.set(response.items);
        this.totalCount.set(response.totalCount);
        this.unreadCount.set(response.unreadCount);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  selectEmail(id: string): void {
    this.isLoading.set(true);
    this.dataReceivedEmailService.getById(id).subscribe({
      next: (email) => {
        this.selectedEmail.set(email);
        if (!email.isRead) {
          this.markAsRead(id, true);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  markAsRead(id: string, isRead: boolean): void {
    this.dataReceivedEmailService.markAsRead(id, isRead).subscribe({
      next: (updated) => {
        this.emails.update((list) =>
          list.map((e) => (e.id === id ? { ...e, isRead: updated.isRead } : e))
        );
        if (this.selectedEmail()?.id === id) {
          this.selectedEmail.update((e) =>
            e ? { ...e, isRead: updated.isRead } : e
          );
        }
        this.refreshUnreadCount();
      },
    });
  }

  deleteEmail(id: string): void {
    this.dataReceivedEmailService.delete(id).subscribe({
      next: () => {
        this.emails.update((list) => list.filter((e) => e.id !== id));
        if (this.selectedEmail()?.id === id) {
          this.selectedEmail.set(undefined);
        }
        this.totalCount.update((c) => c - 1);
        this.refreshUnreadCount();
      },
    });
  }

  refreshUnreadCount(): void {
    this.dataReceivedEmailService.getUnreadCount().subscribe({
      next: (count) => {
        this.unreadCount.set(count);
      },
    });
  }
}
