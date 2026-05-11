// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Row component displaying a single messaging provider with actions.
 * @param data - The messaging provider to display
 * @param editEvent - Emitted when the edit button is clicked
 * @param deleteEvent - Emitted when the delete button is clicked
 * @param testEvent - Emitted when the test button is clicked
 * @param toggleEnabledEvent - Emitted when the enable/disable toggle is clicked
 */
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MessagingProvider } from '../../../models/messaging-provider.model';
import { PluginTrashIconRedComponent } from '../../../shared/icons/trash-icon-red.component';

@Component({
  selector: 'lib-messaging-providers-row',
  standalone: true,
  imports: [TranslateModule, PluginTrashIconRedComponent],
  templateUrl: './messaging-providers-row.component.html',
  styleUrls: ['./messaging-providers-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingProvidersRowComponent {

  @Input() data!: MessagingProvider;
  @Output() editEvent = new EventEmitter<MessagingProvider>();
  @Output() deleteEvent = new EventEmitter<MessagingProvider>();
  @Output() testEvent = new EventEmitter<MessagingProvider>();
  @Output() toggleEnabledEvent = new EventEmitter<MessagingProvider>();

  getStatusKey(): string {
    return this.data.isEnabled
      ? 'settings.messaging-providers.status.enabled'
      : 'settings.messaging-providers.status.disabled';
  }

  getStatusClass(): string {
    return this.data.isEnabled ? 'status-enabled' : 'status-disabled';
  }

  onEdit(): void {
    this.editEvent.emit(this.data);
  }

  onDelete(): void {
    this.deleteEvent.emit(this.data);
  }

  onTest(): void {
    this.testEvent.emit(this.data);
  }

  onToggleEnabled(): void {
    this.toggleEnabledEvent.emit(this.data);
  }
}
