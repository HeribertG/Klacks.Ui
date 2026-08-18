// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Navigation sidebar for the Messaging workplace section.
 * Provides direction and provider filters for message display.
 * @param providers - Signal holding the list of available messaging providers
 * @param filterChanged - Output event emitting the current filter state
 */

import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  EventEmitter,
  Output,
  Input,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataMessagingService } from '../../services/data-messaging.service';
import { MessagingProvider } from '../../models/messaging-provider.model';
import { MessageDirection } from '../../enums/message-direction.enum';
import { MessageScope } from '../../enums/message-scope.enum';

@Component({
  selector: 'lib-messaging-nav',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
  ],
  templateUrl: './messaging-nav.component.html',
  styleUrls: ['./messaging-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingNavComponent implements OnInit, OnDestroy {
  @Input() hasMore = false;
  @Output() filterChanged = new EventEmitter<{ direction?: MessageDirection; scope?: MessageScope; providerIds?: string[]; showAll?: boolean }>();

  private dataService = inject(DataMessagingService);
  private cdr = inject(ChangeDetectorRef);

  providers = signal<MessagingProvider[]>([]);
  selectedProviders = signal<Set<string>>(new Set());
  selectedDirection = signal<MessageDirection | undefined>(undefined);
  selectedScope = signal<MessageScope | undefined>(undefined);
  showAllValue = false;

  directionValue: MessageDirection | undefined = undefined;
  scopeValue: MessageScope | undefined = undefined;

  MessageDirection = MessageDirection;
  MessageScope = MessageScope;

  private ngUnsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.dataService.getProviders()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (providerList) => {
          this.providers.set(providerList);
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onDirectionChange(): void {
    this.selectedDirection.set(this.directionValue);
    this.emitFilter();
  }

  onScopeChange(): void {
    this.selectedScope.set(this.scopeValue);
    this.emitFilter();
  }

  onProviderToggle(providerId: string): void {
    const current = new Set(this.selectedProviders());
    if (current.has(providerId)) {
      current.delete(providerId);
    } else {
      current.add(providerId);
    }
    this.selectedProviders.set(current);
    this.emitFilter();
  }

  onResetFilter(): void {
    this.directionValue = undefined;
    this.selectedDirection.set(undefined);
    this.scopeValue = undefined;
    this.selectedScope.set(undefined);
    this.selectedProviders.set(new Set());
    this.showAllValue = false;
    this.emitFilter();
  }

  onShowAllChange(): void {
    this.emitFilter();
  }

  isProviderSelected(providerId: string): boolean {
    return this.selectedProviders().has(providerId);
  }

  private emitFilter(): void {
    const providerIds = this.selectedProviders().size > 0
      ? Array.from(this.selectedProviders())
      : undefined;
    this.filterChanged.emit({
      direction: this.selectedDirection(),
      scope: this.selectedScope(),
      providerIds,
      showAll: this.showAllValue,
    });
  }
}
