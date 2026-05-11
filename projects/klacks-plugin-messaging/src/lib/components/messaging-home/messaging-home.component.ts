// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Home page for the Messaging workplace section.
 * Wraps the chat area and filter navigation sidebar.
 */

import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { PLUGIN_WORKPLACE_HOST, PLUGIN_GROUP_SELECTION, IPluginClient } from 'klacks-plugin-contracts';
import { MessagingChatComponent } from '../messaging-chat/messaging-chat.component';
import { MessagingNavComponent } from '../messaging-nav/messaging-nav.component';
import { MessageDirection } from '../../enums/message-direction.enum';

@Component({
  selector: 'lib-messaging-home',
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

  private host = inject(PLUGIN_WORKPLACE_HOST);
  private groupSelection = inject(PLUGIN_GROUP_SELECTION);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.host.setContainerToNormalSize();
    this.host.setSearchVisibility(true);
    this.host.setClientSearchMode(true);
    this.host.setSavebarVisibility(false);
    this.host.setActiveManagerByRoute('messaging');

    this.host.clientSelected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((client: IPluginClient) => {
        this.onClientSelected(client);
      });
  }

  ngOnDestroy(): void {
    this.host.setClientSearchMode(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterChanged(filter: { direction?: MessageDirection; providerIds?: string[] }): void {
    this.messagingChat.applyFilter(filter);
  }

  private onClientSelected(client: IPluginClient): void {
    const displayName = `${client.idNumber}, ${client.firstName} ${client.name}`.trim();
    this.groupSelection.clearSelection();
    this.messagingChat.selectedContact.set(displayName);
    this.messagingChat.loadMessages();
  }
}
