// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Bridges domain events from the event bus to toasts and navigation. Event messages are i18n
 * keys and are translated here; unknown keys fall through as plain text.
 * @param event.message - Translation key (or plain text) shown as the toast body
 * @param event.code / event.context - Toast name respectively header text
 * @param UNDO_OFFERED - Carries the undo callback the domain layer provides; only rendering happens here
 */

import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { EventBus } from 'src/app/application/services/event-bus.service';
import {
  DomainEventType,
  ErrorEvent,
  SuccessEvent,
  WarningEvent,
  InfoEvent,
  NavigationEvent,
  UndoOfferedEvent,
} from 'src/app/domain/events/domain-events';
import { ToastShowService } from '../toast/toast-show.service';

@Injectable({
  providedIn: 'root',
})
export class DomainEventHandler {
  private eventBus = inject(EventBus);
  private toastService = inject(ToastShowService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.setupErrorHandler();
    this.setupSuccessHandler();
    this.setupWarningHandler();
    this.setupInfoHandler();
    this.setupNavigationHandler();
    this.setupUndoHandler();
  }

  private setupErrorHandler(): void {
    this.eventBus.on<ErrorEvent>(DomainEventType.ERROR).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.toastService.showError(this.translateMessage(event.message), event.code || 'Error');
    });
  }

  private setupSuccessHandler(): void {
    this.eventBus.on<SuccessEvent>(DomainEventType.SUCCESS).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.toastService.showSuccess(this.translateMessage(event.message), event.context || '', '');
    });
  }

  private setupWarningHandler(): void {
    this.eventBus.on<WarningEvent>(DomainEventType.WARNING).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.toastService.showInfo(this.translateMessage(event.message), event.context || '', '');
    });
  }

  private setupInfoHandler(): void {
    this.eventBus.on<InfoEvent>(DomainEventType.INFO).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.toastService.showInfo(this.translateMessage(event.message), event.context || '', '');
    });
  }

  private setupUndoHandler(): void {
    this.eventBus.on<UndoOfferedEvent>(DomainEventType.UNDO_OFFERED).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      const text = `${this.translateMessage(event.messageKey)}\n${event.detail}`;
      this.toastService.showUndo(text, this.translateMessage(event.labelKey), event.onUndo, event.delayMs);
    });
  }

  private translateMessage(message: string): string {
    return typeof message === 'string' ? this.translate.instant(message) : String(message);
  }

  private setupNavigationHandler(): void {
    this.eventBus.on<NavigationEvent>(DomainEventType.NAVIGATE).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.router.navigate([event.route]);
    });
  }
}
