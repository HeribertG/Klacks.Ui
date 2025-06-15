import { inject, Injectable } from '@angular/core';
import { ConstantKeys } from 'src/app/shared/grid/constants/constants';
import { ISetting, Setting } from 'src/app/core/settings-various-class';
import { DataSettingsVariousService } from '../data-settings-various.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementGridSettingsService {
  public dataSettingsVariousService = inject(DataSettingsVariousService);

  public backgroundColorHoliday = '';
  public backgroundColor = '';
  public backgroundColorHolidayOfficially = '';
  public backgroundColorSaturday = '';
  public backgroundColorSunday = '';
  public borderColor = '';

  public settingList: ISetting[] = [];
  public settingsCount = 0;

  private backgroundColorHolidayDummy = '';
  private backgroundColorDummy = '';
  private backgroundColorHolidayOfficiallyDummy = '';
  private backgroundColorSaturdayDummy = '';
  private backgroundColorSundayDummy = '';
  private borderColorDummy = '';

  readSettingList() {
    this.dataSettingsVariousService.readSettingList().subscribe((l) => {
      if (l) {
        this.settingList = l as ISetting[];
        this.resetSetting();
        this.settingList.forEach((x) => {
          if (x) {
            this.setSetting(x);
          }
        });
      }
    });
  }

  private resetSetting() {
    this.backgroundColorHoliday = '';
    this.backgroundColor = '';
    this.backgroundColorHolidayOfficially = '';
    this.backgroundColorSaturday = '';
    this.backgroundColorSunday = '';
    this.borderColor = '';

    this.backgroundColorHolidayDummy = '';
    this.backgroundColorDummy = '';
    this.backgroundColorHolidayOfficiallyDummy = '';
    this.backgroundColorSaturdayDummy = '';
    this.backgroundColorSundayDummy = '';
    this.borderColorDummy = '';
  }

  private setSetting(value: ISetting) {
    switch (value.type) {
      case ConstantKeys.BACKGROUND_COLOR_HOLIDAY_KEY:
        this.backgroundColorHoliday = value.value;
        this.backgroundColorHolidayDummy = value.value;
        break;
      case ConstantKeys.BACKGROUND_COLOR_KEY:
        this.backgroundColor = value.value;
        this.backgroundColorDummy = value.value;
        break;
      case ConstantKeys.BACKGROUND_COLOR_OFFICIALLY_KEY:
        this.backgroundColorHolidayOfficially = value.value;
        this.backgroundColorHolidayOfficiallyDummy = value.value;
        break;
      case ConstantKeys.BACKGROUND_COLOR_SATURDAY_KEY:
        this.backgroundColorSaturday = value.value;
        this.backgroundColorSaturdayDummy = value.value;
        break;
      case ConstantKeys.BACKGROUND_COLOR_SUNDAY_KEY:
        this.backgroundColorSunday = value.value;
        this.backgroundColorSundayDummy = value.value;
        break;
      case ConstantKeys.BORDER_COLOR_KEY:
        this.borderColor = value.value;
        this.borderColorDummy = value.value;
        break;
    }
  }
  private saveSetting() {
    this.saveSetting_sub(
      this.backgroundColorHoliday,
      this.backgroundColorHolidayDummy,
      ConstantKeys.BACKGROUND_COLOR_HOLIDAY_KEY
    );
    this.saveSetting_sub(
      this.backgroundColor,
      this.backgroundColorDummy,
      ConstantKeys.BACKGROUND_COLOR_KEY
    );
    this.saveSetting_sub(
      this.backgroundColorHolidayOfficially,
      this.backgroundColorHolidayOfficiallyDummy,
      ConstantKeys.BACKGROUND_COLOR_OFFICIALLY_KEY
    );
    this.saveSetting_sub(
      this.backgroundColorSaturday,
      this.backgroundColorSaturdayDummy,
      ConstantKeys.BACKGROUND_COLOR_SATURDAY_KEY
    );
    this.saveSetting_sub(
      this.backgroundColorSunday,
      this.backgroundColorSundayDummy,
      ConstantKeys.BACKGROUND_COLOR_SUNDAY_KEY
    );
    this.saveSetting_sub(
      this.borderColor,
      this.borderColorDummy,
      ConstantKeys.BORDER_COLOR_KEY
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private saveSetting_sub(value: any, dummy: any, type: string) {
    if (value !== dummy) {
      const c = this.settingList.find((x) => x.type === type);
      if (c) {
        c.value = value;
        this.dataSettingsVariousService.updateSetting(c).subscribe(() => {});
      } else {
        const nc = new Setting();
        nc.value = value;
        nc.type = type;
        this.dataSettingsVariousService.addSetting(nc).subscribe(() => {});
      }
    }
  }

  private isSetting_Dirty(): boolean {
    if (this.backgroundColorHoliday !== this.backgroundColorHolidayDummy) {
      return true;
    }
    if (this.backgroundColor !== this.backgroundColorDummy) {
      return true;
    }
    if (
      this.backgroundColorHolidayOfficially !==
      this.backgroundColorHolidayOfficiallyDummy
    ) {
      return true;
    }
    if (this.backgroundColorSaturday !== this.backgroundColorSaturdayDummy) {
      return true;
    }
    if (this.backgroundColorSunday !== this.backgroundColorSundayDummy) {
      return true;
    }
    if (this.borderColor !== this.borderColorDummy) {
      return true;
    }

    return false;
  }
}
