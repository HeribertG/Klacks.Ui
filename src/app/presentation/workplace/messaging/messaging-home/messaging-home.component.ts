// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Home page for the Messaging workplace section.
 * Wraps the chat area and filter navigation sidebar.
 */

import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { MessagingChatComponent } from '../messaging-chat/messaging-chat.component';
import { MessagingNavComponent } from '../messaging-nav/messaging-nav.component';
import { MessageDirection } from 'src/app/domain/enums/message-direction.enum';
import { IClient } from 'src/app/domain/models/client/client-class';

@Component({
  selector: 'app-messaging-home',
  standalone: true,
  imports: [
    TranslateModule,
    MessagingChatComponent,
    MessagingNavComponent,
  ],
  templateUrl: './messaging-home.component.html',
  styleUrls: ['./messaging-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingHomeComponent implements OnInit, OnDestroy {
  @ViewChild('messagingChat') messagingChat!: MessagingChatComponent;

  private workplaceStateService = inject(WorkplaceStateService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private savebarService = inject(SavebarService);
  private navigationService = inject(NavigationService);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(true);
    this.searchService.setClientSearchMode(true);
    this.savebarService.setSavebarVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute('messaging');

    this.searchService.clientSelected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((client: IClient) => {
        this.onClientSelected(client);
      });
  }

  ngOnDestroy(): void {
    this.searchService.setClientSearchMode(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterChanged(filter: { direction?: MessageDirection; providerIds?: string[] }): void {
    this.messagingChat.applyFilter(filter);
  }

  private onClientSelected(client: IClient): void {
    const displayName = `${client.idNumber}, ${client.firstName} ${client.name}`.trim();
    this.messagingChat.selectedContact.set(displayName);
    this.messagingChat.loadMessages();
  }
}
