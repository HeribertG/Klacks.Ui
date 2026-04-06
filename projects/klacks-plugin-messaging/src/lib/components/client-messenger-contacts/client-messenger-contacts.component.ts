// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Client-edit card showing per-employee messenger contacts (Telegram chat IDs,
 * WhatsApp numbers, ...). Direct-save via plugin REST endpoint, no savebar.
 *
 * @param clientId - Klacks client ID this card belongs to
 * @param dataService - REST service for messenger_contact CRUD
 * @param toastService - Plugin toast notification service
 */

import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { PLUGIN_TOAST_SERVICE } from 'klacks-plugin-contracts';
import { DataMessengerContactService } from '../../services/data-messenger-contact.service';
import {
  MessengerContact,
  CreateMessengerContact,
} from '../../models/messenger-contact.model';
import {
  MessengerType,
  MESSENGER_TYPE_LABELS,
} from '../../enums/messenger-type.enum';

interface EditableContact {
  id?: string;
  type: MessengerType;
  value: string;
  description: string;
  isNew: boolean;
}

@Component({
  selector: 'lib-client-messenger-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './client-messenger-contacts.component.html',
  styleUrls: ['./client-messenger-contacts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientMessengerContactsComponent implements OnChanges {
  @Input() clientId: string | null = null;

  private dataService = inject(DataMessengerContactService);
  private toastService = inject(PLUGIN_TOAST_SERVICE);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  contacts = signal<EditableContact[]>([]);
  isLoading = signal(false);

  readonly typeOptions: { value: MessengerType; label: string }[] = Object.entries(
    MESSENGER_TYPE_LABELS,
  ).map(([key, label]) => ({ value: Number(key) as MessengerType, label }));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] && this.clientId) {
      this.load();
    }
  }

  private load(): void {
    if (!this.clientId) return;
    this.isLoading.set(true);
    this.dataService.getByClient(this.clientId).subscribe({
      next: list => {
        this.contacts.set(
          list.map(c => ({
            id: c.id,
            type: c.type,
            value: c.value,
            description: c.description ?? '',
            isNew: false,
          })),
        );
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.showError('client.messenger-contacts.error.load');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onAdd(): void {
    this.contacts.update(list => [
      ...list,
      { type: MessengerType.Telegram, value: '', description: '', isNew: true },
    ]);
  }

  async onDelete(index: number): Promise<void> {
    const entry = this.contacts()[index];
    if (entry.isNew) {
      this.contacts.update(list => list.filter((_, i) => i !== index));
      return;
    }
    if (!entry.id) return;
    try {
      await firstValueFrom(this.dataService.delete(entry.id));
      this.contacts.update(list => list.filter((_, i) => i !== index));
      this.toastService.showSuccess(
        this.translate.instant('client.messenger-contacts.success.delete'),
        this.translate.instant('TOAST_SUCCESS'),
      );
    } catch {
      this.toastService.showError('client.messenger-contacts.error.delete');
    } finally {
      this.cdr.markForCheck();
    }
  }

  async onSaveRow(index: number): Promise<void> {
    if (!this.clientId) return;
    const entry = this.contacts()[index];
    if (!entry.value.trim()) {
      this.toastService.showError('client.messenger-contacts.error.value-required');
      return;
    }

    const dto: CreateMessengerContact = {
      clientId: this.clientId,
      type: entry.type,
      value: entry.value.trim(),
      description: entry.description.trim() || null,
    };

    try {
      const saved = entry.isNew
        ? await firstValueFrom(this.dataService.create(dto))
        : await firstValueFrom(this.dataService.update(entry.id!, dto));

      this.contacts.update(list => {
        const next = [...list];
        next[index] = {
          id: saved.id,
          type: saved.type,
          value: saved.value,
          description: saved.description ?? '',
          isNew: false,
        };
        return next;
      });
      this.toastService.showSuccess(
        this.translate.instant('client.messenger-contacts.success.save'),
        this.translate.instant('TOAST_SUCCESS'),
      );
    } catch {
      this.toastService.showError('client.messenger-contacts.error.save');
    } finally {
      this.cdr.markForCheck();
    }
  }
}
