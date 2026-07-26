// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal, inject, effect, untracked } from '@angular/core';
import {
  ISetting,
  Setting,
} from 'src/app/domain/models/settings/settings-various-class';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { ConstantKeys } from 'src/app/domain/constants/grid-constants';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GridThemeService } from './grid-theme.service';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class GridColorService {
  private dataSettingsVariousService = inject(DataSettingsVariousService);
  private gridTheme = inject(GridThemeService);
  private destroy$ = new Subject<void>();

  public isReset = signal(false);

  settingList: ISetting[] = [];

  warningColor = 'red';
  successColor = 'green';
  backGroundColor = '#f2eded';
  backGroundColorSaturday = '#F5F5DC';
  backGroundColorHolyday = '#82E0AA';
  backGroundColorSunday = '#95b9d0';
  backGroundColorOfficiallyHoliday = '#48C9B0';
  borderColor = '#abad94';
  boundaryBorderColor = '#424949';
  mainFontColor = '#000000';
  subFontColor = '#404040';
  foreGroundColor = '#000000';
  controlBackGroundColor = '#D5DBDB';
  headerBackGroundColor = '#FFFFFF';
  headerForeGroundColor = '#4d4d4d';
  focusBorderColor = '#1E90FF';
  unfocusedSelectionBorderColor = 'grey';
  evenMonthColor = this.backGroundColor;
  oddMonthColor = '#dad7d7';
  borderColorEndMonth = '#566573';
  backGroundContainerColor = '#424949';
  toolTipBackGroundColor = '#ffffcc';
  scrollTrack = '#A9A9A9';
  backGroundSealedColor = '#424949';
  workChangeColor = '#FFA500';
  surchargeColor = '#FFFF00';
  availableShiftsHeaderColor = 'red';
  availabilityHighlightColor = 'rgba(76, 175, 80, 0.15)';

  private readonly colorSettingDefinitions: { key: string; property: keyof GridColorService & string }[] = [
    { key: ConstantKeys.BACKGROUND_COLOR_HOLIDAY_KEY, property: 'backGroundColorHolyday' },
    { key: ConstantKeys.BACKGROUND_COLOR_KEY, property: 'backGroundColor' },
    { key: ConstantKeys.BACKGROUND_COLOR_OFFICIALLY_KEY, property: 'backGroundColorOfficiallyHoliday' },
    { key: ConstantKeys.BACKGROUND_COLOR_SATURDAY_KEY, property: 'backGroundColorSaturday' },
    { key: ConstantKeys.BACKGROUND_COLOR_SUNDAY_KEY, property: 'backGroundColorSunday' },
    { key: ConstantKeys.BORDER_COLOR_KEY, property: 'borderColor' },
    { key: ConstantKeys.EVEN_MONTH_COLOR_KEY, property: 'evenMonthColor' },
    { key: ConstantKeys.MAIN_TEXT_COLOR_KEY, property: 'mainFontColor' },
    { key: ConstantKeys.ODD_MONTH_COLOR_KEY, property: 'oddMonthColor' },
    { key: ConstantKeys.SUB_TEXT_COLOR_KEY, property: 'subFontColor' },
    { key: ConstantKeys.FOREGROUND_COLOR_KEY, property: 'foreGroundColor' },
    { key: ConstantKeys.CONTROL_BACKGROUND_COLOR_KEY, property: 'controlBackGroundColor' },
    { key: ConstantKeys.HEADER_BACKGROUND_COLOR_KEY, property: 'headerBackGroundColor' },
    { key: ConstantKeys.HEADER_FOREGROUND_COLOR_KEY, property: 'headerForeGroundColor' },
    { key: ConstantKeys.FOCUS_BORDER_COLOR_KEY, property: 'focusBorderColor' },
    { key: ConstantKeys.BORDER_END_MONTH_COLOR_KEY, property: 'borderColorEndMonth' },
    { key: ConstantKeys.WORK_CHANGE_COLOR_KEY, property: 'workChangeColor' },
    { key: ConstantKeys.SURCHARGE_COLOR_KEY, property: 'surchargeColor' },
  ];

  private readonly colorSettingMap = new Map<string, keyof GridColorService & string>(
    this.colorSettingDefinitions.map(d => [d.key, d.property])
  );

  private settingListDummy: ISetting[] = [];

  private settingsCount = 0;

  constructor() {
    effect(() => {
      const headerBg = this.gridTheme.headerBackground();
      const headerColor = this.gridTheme.headerColor();
      const containerBg = this.gridTheme.containerBackground();
      const rowColor = this.gridTheme.rowHeaderColor();
      const borderColor = this.gridTheme.headerBorderColor();

      untracked(() => this.applyThemeDefaults(headerBg, headerColor, containerBg, rowColor, borderColor));
    });
  }

  private applyThemeDefaults(headerBg: string, headerColor: string, containerBg: string, rowColor: string, _borderColor: string): void {
    let changed = false;

    const dbOverrideControl = this.hasDbOverride(ConstantKeys.CONTROL_BACKGROUND_COLOR_KEY);
    const dbOverrideHeaderFg = this.hasDbOverride(ConstantKeys.HEADER_FOREGROUND_COLOR_KEY);
    const dbOverrideFg = this.hasDbOverride(ConstantKeys.FOREGROUND_COLOR_KEY);
    if (!dbOverrideControl) {
      this.controlBackGroundColor = headerBg;
      changed = true;
    }

    if (!dbOverrideHeaderFg) {
      this.headerForeGroundColor = headerColor;
      changed = true;
    }

    if (!dbOverrideFg) {
      this.foreGroundColor = rowColor;
      changed = true;
    }

    this.backGroundContainerColor = containerBg;
    this.boundaryBorderColor = containerBg;
    this.backGroundSealedColor = containerBg;
    changed = true;

    if (changed) {
      this.isReset.set(true);
      resetSignalAfterDelay(this.isReset);
    }
  }

  private hasDbOverride(key: string): boolean {
    const setting = this.settingList.find(s => s.type === key);
    return setting?.id != null;
  }

  areObjectsDirty(): boolean {
    if (this.isSetting_Dirty()) {
      return true;
    }

    return false;
  }

  async readDataAsync(): Promise<void> {
    const settings = await firstValueFrom(
      this.dataSettingsVariousService.readSettingList()
    );
    this.settingList = [];
    this.settingListDummy = [];
    this.resetSettingList();

    if (settings) {
      const dbSettings = settings as ISetting[];
      dbSettings.forEach((x) => {
        if (x) {
          this.setSetting(x);
        }
      });
      this.settingListDummy = cloneObject<ISetting[]>(this.settingList);
    }
  }

  save() {
    this.saveSetting();
  }

  private readSettingList() {
    this.dataSettingsVariousService.readSettingList().pipe(takeUntil(this.destroy$)).subscribe((l) => {
      this.settingList = [];
      this.settingListDummy = [];
      this.resetSettingList();

      if (l) {
        (l as ISetting[]).forEach((x) => {
          if (x) {
            this.setSetting(x);
          }
        });

        this.settingListDummy = cloneObject<ISetting[]>(this.settingList);

        this.isReset.set(true);
        resetSignalAfterDelay(this.isReset);
      }
    });
  }

  private resetSettingList(): void {
    for (const def of this.colorSettingDefinitions) {
      const s = new Setting();
      s.value = this[def.property] as string;
      s.type = def.key;
      this.settingList.push(s);
    }
  }

  private isValidColor(color: string): boolean {
    if (!color || color.trim() === '') return false;
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  private setSetting(value: ISetting) {
    if (!this.isValidColor(value.value)) {
      return;
    }

    const property = this.colorSettingMap.get(value.type);
    if (property) {
      (this as Record<string, unknown>)[property] = value.value;
      this.setCurrentSetting(value);
    }
  }

  private setCurrentSetting(value: ISetting): void {
    const s = this.settingList.find((x) => x.type === value.type);
    if (s) {
      s.value = value.value;
      s.id = value.id;
    }
  }

  private saveSetting() {
    this.settingList.forEach((x) => {
      const dummy = this.settingListDummy.find((y) => y.type === x.type);
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      this.saveSetting_sub(x.value, dummy?.value!, x);
    });
  }

  private saveSetting_sub(value: string, dummy: string, c: ISetting) {
    if (value !== dummy) {
      if (c.id) {
        this.countSettings(true);
        this.dataSettingsVariousService.updateSetting(c).pipe(takeUntil(this.destroy$)).subscribe(() => {
          this.countSettings(false);
        });
      } else {
        const nc = new Setting();
        delete c.id;
        nc.value = value;
        nc.type = c.type;
        this.countSettings(true);
        this.dataSettingsVariousService.addSetting(nc).pipe(takeUntil(this.destroy$)).subscribe((savedSetting) => {
          c.id = savedSetting.id;
          this.countSettings(false);
        });
      }
    }
  }

  isSetting_Dirty(): boolean {
    // If dummy list is empty, data hasn't been loaded yet - not dirty
    if (this.settingListDummy.length === 0) {
      return false;
    }
    
    let result = false;
    this.settingList.forEach((x) => {
      const dummy = this.settingListDummy.find((y) => y.type === x.type);
      if (dummy) {
        if (x.value !== dummy!.value) {
          result = true;
        }
      } else {
        result = true;
      }
    });

    return result;
  }

  private countSettings(action: boolean) {
    if (action) {
      this.settingsCount++;
    } else {
      this.settingsCount--;
    }
    if (this.settingsCount === 0) {
      this.readSettingList();
    }
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
