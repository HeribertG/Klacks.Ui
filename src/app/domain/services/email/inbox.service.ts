// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { computed, inject, Injectable, signal } from '@angular/core';
import { DataReceivedEmailService } from 'src/app/infrastructure/api/email/data-received-email.service';
import { DataEmailFolderService } from 'src/app/infrastructure/api/email/data-email-folder.service';
import {
  IReceivedEmail,
  IReceivedEmailListItem,
} from 'src/app/domain/models/email/received-email.model';
import { IEmailFolder } from 'src/app/domain/models/email/email-folder.model';
import { TRASH_FOLDER } from 'src/app/domain/constants/email.constants';

const DEFAULT_PAGE_SIZE = 50;

const AUTOMATED_SENDER_PATTERNS = [
  'noreply', 'no-reply', 'mailer-daemon', 'postmaster',
  'newsletter', 'notifications', 'mailings',
];

@Injectable({
  providedIn: 'root',
})
export class InboxService {
  private dataReceivedEmailService = inject(DataReceivedEmailService);
  private dataEmailFolderService = inject(DataEmailFolderService);

  emails = signal<IReceivedEmailListItem[]>([]);
  selectedEmail = signal<IReceivedEmail | undefined>(undefined);
  unreadCount = signal<number>(0);
  totalCount = signal<number>(0);
  isLoading = signal<boolean>(false);
  folders = signal<IEmailFolder[]>([]);
  selectedFolder = signal<string | null>(null);
  readFilter = signal<'all' | 'read' | 'unread'>('all');
  sortDirection = signal<'asc' | 'desc'>('desc');
  relevanceFilter = signal<'all' | 'relevant' | 'other'>('all');

  isTrashFolder = computed(() => this.selectedFolder() === TRASH_FOLDER);

  inboxUnreadCount = computed(() => {
    const folders = this.folders();
    if (folders.length === 0) return 0;
    const inboxFolder = folders.find(f => f.imapFolderName !== TRASH_FOLDER);
    return inboxFolder?.unreadCount ?? 0;
  });

  displayEmails = computed(() => {
    const emails = this.emails();
    const filter = this.relevanceFilter();
    if (filter === 'all') return emails;
    if (filter === 'relevant') return emails.filter(e => !this.isAutomatedSender(e.fromAddress));
    return emails.filter(e => this.isAutomatedSender(e.fromAddress));
  });

  loadFolders(): void {
    this.dataEmailFolderService.getFolders().subscribe({
      next: (folders) => {
        this.folders.set(folders);
        if (folders.length > 0 && !this.selectedFolder()) {
          this.selectFolder(folders[0].imapFolderName);
        } else {
          this.loadEmails();
        }
      },
    });
  }

  selectFolder(imapFolderName: string): void {
    this.selectedFolder.set(imapFolderName);
    this.selectedEmail.set(undefined);
    this.loadEmails();
  }

  loadEmails(skip = 0, take = DEFAULT_PAGE_SIZE): void {
    this.isLoading.set(true);
    const folder = this.selectedFolder() ?? undefined;
    const readFilter = this.readFilter() === 'all' ? undefined : this.readFilter();
    const sortDir = this.sortDirection();
    this.dataReceivedEmailService.getList(skip, take, folder, readFilter, sortDir).subscribe({
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

  fetchAndReload(): void {
    this.isLoading.set(true);
    this.dataReceivedEmailService.fetchNow().subscribe({
      next: (result) => {
        this.loadFolders();
      },
      error: (err) => {
        console.error('FetchNow error:', err);
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
          list.map((e) => (e.id === id ? { ...e, isRead: updated.isRead } : e)),
        );
        if (this.selectedEmail()?.id === id) {
          this.selectedEmail.update((e) =>
            e ? { ...e, isRead: updated.isRead } : e,
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

  restoreEmail(id: string): void {
    this.dataReceivedEmailService.restore(id).subscribe({
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

  permanentlyDeleteEmail(id: string): void {
    this.dataReceivedEmailService.permanentlyDelete(id).subscribe({
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

  moveEmailToFolder(id: string, folder: string): void {
    this.dataReceivedEmailService.moveToFolder(id, folder).subscribe({
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

  createFolder(name: string, imapFolderName: string): void {
    this.dataEmailFolderService.createFolder(name, imapFolderName).subscribe({
      next: () => {
        this.loadFolders();
      },
    });
  }

  deleteFolder(id: string): void {
    this.dataEmailFolderService.deleteFolder(id).subscribe({
      next: () => {
        this.loadFolders();
        const remainingFolders = this.folders().filter((f) => f.id !== id);
        if (remainingFolders.length > 0) {
          this.selectFolder(remainingFolders[0].imapFolderName);
        }
      },
    });
  }

  refreshUnreadCount(): void {
    this.dataReceivedEmailService.getUnreadCount().subscribe({
      next: (count) => {
        this.unreadCount.set(count);
      },
    });
    this.dataEmailFolderService.getFolders().subscribe({
      next: (folders) => {
        this.folders.set(folders);
      },
    });
  }

  setReadFilter(filter: 'all' | 'read' | 'unread'): void {
    this.readFilter.set(filter);
    this.loadEmails();
  }

  setSortDirection(direction: 'asc' | 'desc'): void {
    this.sortDirection.set(direction);
    this.loadEmails();
  }

  toggleSortDirection(): void {
    this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    this.loadEmails();
  }

  setRelevanceFilter(filter: 'all' | 'relevant' | 'other'): void {
    this.relevanceFilter.set(filter);
  }

  private isAutomatedSender(address: string): boolean {
    const lower = address.toLowerCase();
    return AUTOMATED_SENDER_PATTERNS.some(pattern => lower.includes(pattern));
  }
}
