// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, computed, effect, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { TranslationService } from 'src/app/domain/services/translation/translation.service';
import { ITranslatedEmail } from 'src/app/domain/models/email/received-email.model';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconEyeClosedComponent } from 'src/app/presentation/icons/icon-eye-closed.component';

import { DomainMessages } from 'src/app/domain/constants/messages';
@Component({
  selector: 'app-inbox-detail',
  templateUrl: './inbox-detail.component.html',
  styleUrls: ['./inbox-detail.component.scss'],
  standalone: true,
  imports: [DatePipe, TranslateModule, FontAwesomeModule, TrashIconRedComponent, IconEyeClosedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxDetailComponent {
  protected readonly faLanguage = faLanguage;

  inboxService = inject(InboxService);
  translationService = inject(TranslationService);
  private sanitizer = inject(DomSanitizer);
  private translateService = inject(TranslateService);

  email = this.inboxService.selectedEmail;
  isTrashFolder = this.inboxService.isTrashFolder;

  translatedResult = signal<ITranslatedEmail | undefined>(undefined);
  showOriginal = signal(true);
  isTranslating = signal(false);
  translateError = signal(false);
  private lastEmailId: string | undefined;

  constructor() {
    void this.translationService.checkStatus();

    effect(() => {
      const currentId = this.email()?.id;
      if (currentId !== this.lastEmailId) {
        this.lastEmailId = currentId;
        this.translatedResult.set(undefined);
        this.showOriginal.set(true);
        this.translateError.set(false);
        this.isTranslating.set(false);
      }
    });
  }

  displaySubject = computed(() => {
    const e = this.email();
    if (!e) return undefined;
    const t = this.translatedResult();
    return t && !this.showOriginal() ? t.subject : e.subject;
  });

  sanitizedBody = computed<SafeHtml | undefined>(() => {
    const e = this.email();
    if (!e) return undefined;
    const t = this.translatedResult();
    const useTranslated = !!t && !this.showOriginal();
    const bodyHtml = useTranslated ? t!.bodyHtml : e.bodyHtml;
    const bodyText = useTranslated ? t!.bodyText : e.bodyText;
    if (bodyHtml) {
      const cleanHtml = DOMPurify.sanitize(bodyHtml);
      return this.sanitizer.bypassSecurityTrustHtml(cleanHtml);
    }
    if (bodyText) {
      return this.sanitizer.bypassSecurityTrustHtml(
        `<pre style="white-space: pre-wrap; font-family: inherit;">${this.escapeHtml(bodyText)}</pre>`
      );
    }
    return undefined;
  });

  onTranslate(): void {
    const e = this.email();
    if (!e || this.isTranslating()) return;

    const requestedId = e.id;
    const targetLanguage = this.translateService.currentLang || this.translateService.defaultLang || DomainMessages.DEFAULT_LANG;
    this.isTranslating.set(true);
    this.translateError.set(false);

    this.inboxService.translateEmail(e.id, targetLanguage).subscribe({
      next: (result) => {
        if (this.email()?.id !== requestedId) return;
        this.translatedResult.set(result);
        this.showOriginal.set(false);
        this.isTranslating.set(false);
      },
      error: () => {
        if (this.email()?.id === requestedId) this.translateError.set(true);
        this.isTranslating.set(false);
      },
    });
  }

  onToggleTranslation(): void {
    this.showOriginal.update((v) => !v);
  }

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
