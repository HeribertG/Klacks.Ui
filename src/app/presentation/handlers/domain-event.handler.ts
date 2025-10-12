import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EventBus } from 'src/app/application/services/event-bus.service';
import {
  DomainEventType,
  ErrorEvent,
  SuccessEvent,
  WarningEvent,
  InfoEvent,
  NavigationEvent,
} from 'src/app/domain/events/domain-events';
import { ToastShowService } from '../toast/toast-show.service';

@Injectable({
  providedIn: 'root',
})
export class DomainEventHandler {
  private eventBus = inject(EventBus);
  private toastService = inject(ToastShowService);
  private router = inject(Router);

  constructor() {
    this.setupErrorHandler();
    this.setupSuccessHandler();
    this.setupWarningHandler();
    this.setupInfoHandler();
    this.setupNavigationHandler();
  }

  private setupErrorHandler(): void {
    this.eventBus.on<ErrorEvent>(DomainEventType.ERROR).subscribe((event) => {
      this.toastService.showError(event.message, event.code || 'Error');
    });
  }

  private setupSuccessHandler(): void {
    this.eventBus.on<SuccessEvent>(DomainEventType.SUCCESS).subscribe((event) => {
      this.toastService.showSuccess(event.message, event.context || '', '');
    });
  }

  private setupWarningHandler(): void {
    this.eventBus.on<WarningEvent>(DomainEventType.WARNING).subscribe((event) => {
      this.toastService.showInfo(event.message, event.context || '', '');
    });
  }

  private setupInfoHandler(): void {
    this.eventBus.on<InfoEvent>(DomainEventType.INFO).subscribe((event) => {
      this.toastService.showInfo(event.message, event.context || '', '');
    });
  }

  private setupNavigationHandler(): void {
    this.eventBus.on<NavigationEvent>(DomainEventType.NAVIGATE).subscribe((event) => {
      this.router.navigate([event.route]);
    });
  }
}
