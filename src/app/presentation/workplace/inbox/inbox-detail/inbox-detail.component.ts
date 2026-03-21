// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconEyeClosedComponent } from 'src/app/presentation/icons/icon-eye-closed.component';

@Component({
  selector: 'app-inbox-detail',
  templateUrl: './inbox-detail.component.html',
  styleUrls: ['./inbox-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe, TranslateModule, TrashIconRedComponent, IconEyeClosedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxDetailComponent {
  inboxService = inject(InboxService);
  private sanitizer = inject(DomSanitizer);

  email = this.inboxService.selectedEmail;
  isTrashFolder = this.inboxService.isTrashFolder;

  sanitizedBody = computed<SafeHtml | undefined>(() => {
    const e = this.email();
    if (!e) return undefined;
    if (e.bodyHtml) {
      return this.sanitizer.bypassSecurityTrustHtml(e.bodyHtml);
    }
    if (e.bodyText) {
      return this.sanitizer.bypassSecurityTrustHtml(
        `<pre style="white-space: pre-wrap; font-family: inherit;">${this.escapeHtml(e.bodyText)}</pre>`
      );
    }
    return undefined;
  });

  onDelete(): void {
    const e = this.email();
    if (e) {
      this.inboxService.deleteEmail(e.id);
    }
  }

  onRestore(): void {
    const e = this.email();
    if (e) {
      this.inboxService.restoreEmail(e.id);
    }
  }

  onPermanentlyDelete(): void {
    const e = this.email();
    if (e) {
      this.inboxService.permanentlyDeleteEmail(e.id);
    }
  }

  onToggleRead(): void {
    const e = this.email();
    if (e) {
      this.inboxService.markAsRead(e.id, !e.isRead);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
