// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card that lets the Klacks owner manage their own messenger identities
 * (Telegram chat IDs, WhatsApp numbers, Threema IDs, ...). Persists as the
 * APP_OWNER_MESSENGERS jsonb setting via the plugin REST endpoint.
 *
 * @param dataService - API service for owner messenger CRUD
 * @param toastService - Plugin toast notification service
 */

import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { PLUGIN_TOAST_SERVICE } from 'klacks-plugin-contracts';
import { DataOwnerMessengerService } from '../../services/data-owner-messenger.service';
import { OwnerMessengerEntry } from '../../models/owner-messenger-entry.model';
import {
  MessengerType,
  MESSENGER_TYPE_LABELS,
} from '../../enums/messenger-type.enum';

interface EditableEntry {
  type: MessengerType;
  value: string;
  description: string;
}

@Component({
  selector: 'lib-owner-messengers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './owner-messengers.component.html',
  styleUrls: ['./owner-messengers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerMessengersComponent implements OnInit {
  private dataService = inject(DataOwnerMessengerService);
  private toastService = inject(PLUGIN_TOAST_SERVICE);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  entries = signal<EditableEntry[]>([]);
  isLoading = signal(false);
  isDirty = signal(false);

  readonly typeOptions: { value: MessengerType; label: string }[] = Object.entries(
    MESSENGER_TYPE_LABELS,
  ).map(([key, label]) => ({ value: Number(key) as MessengerType, label }));

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.dataService.getOwnerMessengers().subscribe({
      next: list => {
        this.entries.set(
          list.map(e => ({
            type: e.type,
            value: e.value,
            description: e.description ?? '',
          })),
        );
        this.isLoading.set(false);
        this.isDirty.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.showError('settings.owner-messengers.error.load');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onAdd(): void {
    this.entries.update(list => [
      ...list,
      { type: MessengerType.Telegram, value: '', description: '' },
    ]);
    this.isDirty.set(true);
  }

  onDelete(index: number): void {
    this.entries.update(list => list.filter((_, i) => i !== index));
    this.isDirty.set(true);
  }

  onChange(): void {
    this.isDirty.set(true);
  }

  async onSave(): Promise<void> {
    const payload: OwnerMessengerEntry[] = this.entries()
      .filter(e => e.value.trim().length > 0)
      .map(e => ({
        type: e.type,
        value: e.value.trim(),
        description: e.description.trim() || null,
      }));

    try {
      const saved = await firstValueFrom(this.dataService.saveOwnerMessengers(payload));
      this.entries.set(
        saved.map(e => ({
          type: e.type,
          value: e.value,
          description: e.description ?? '',
        })),
      );
      this.isDirty.set(false);
      this.toastService.showSuccess(
        this.translate.instant('settings.owner-messengers.success.save'),
        this.translate.instant('TOAST_SUCCESS'),
      );
    } catch {
      this.toastService.showError('settings.owner-messengers.error.save');
    } finally {
      this.cdr.markForCheck();
    }
  }
}
