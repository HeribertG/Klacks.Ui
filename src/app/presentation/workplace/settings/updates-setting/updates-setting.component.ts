// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin Updates card: shows current/available version, recent operation history, lets the admin
 * configure auto-update behaviour and trigger an update or rollback.
 * Reads/writes through DataUpdateService (api/backend/update); pure presentation, no execution.
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import {
  IUpdateConfig,
  IUpdateHistoryItem,
  IUpdateStatus,
} from 'src/app/infrastructure/api/settings/data-update.service';

const UPDATE_CHANNELS = ['Stable', 'Beta'];

@Component({
  selector: 'app-updates-setting',
  templateUrl: './updates-setting.component.html',
  styleUrls: ['./updates-setting.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdatesSettingComponent implements OnInit {
  private dataUpdateService = inject(DataManagementUpdateService);

  public readonly channels = UPDATE_CHANNELS;
  public status = signal<IUpdateStatus | null>(null);
  public history = signal<IUpdateHistoryItem[]>([]);
  public config = signal<IUpdateConfig | null>(null);
  public busy = signal(false);
  public actionMessage = signal<string>('');

  ngOnInit(): void {
    this.reload();
    this.dataUpdateService.getConfig().subscribe(c => this.config.set(c));
  }

  public reload(): void {
    this.dataUpdateService.getStatus().subscribe(s => this.status.set(s));
    this.dataUpdateService.getHistory().subscribe(h => this.history.set(h));
  }

  public async triggerNow(): Promise<void> {
    await this.runAction(() => firstValueFrom(this.dataUpdateService.triggerUpdate()));
  }

  public async rollback(): Promise<void> {
    await this.runAction(() => firstValueFrom(this.dataUpdateService.rollbackUpdate()));
  }

  public onConfigChange(): void {
    const current = this.config();
    if (current) {
      this.dataUpdateService.saveConfig(current).subscribe(saved => this.config.set(saved));
    }
  }

  private async runAction(action: () => Promise<{ reason: string }>): Promise<void> {
    this.busy.set(true);
    try {
      const result = await action();
      this.actionMessage.set(result.reason);
      this.reload();
    } finally {
      this.busy.set(false);
    }
  }
}
