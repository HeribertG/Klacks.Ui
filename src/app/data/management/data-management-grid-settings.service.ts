import { Injectable } from '@angular/core';
import { ConstantKeys } from 'src/app/grid/constants/constants';
import { ISetting, Setting } from 'src/app/core/settings-various-class';
import { DataSettingsVariousService } from '../data-settings-various.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementGridSettingsService {
  backgroundColorHoliday = '';
  backgroundColor = '';
  backgroundColorHolidayOfficially = '';
  backgroundColorSaturday = '';
  backgroundColorSunday = '';
  borderColor = '';

  backgroundColorHolidayDummy = '';
  backgroundColorDummy = '';
  backgroundColorHolidayOfficiallyDummy = '';
  backgroundColorSaturdayDummy = '';
  backgroundColorSundayDummy = '';
  borderColorDummy = '';

  settingList: ISetting[] = [];
  settingsCount = 0;

  constructor(public dataSettingsVariousService: DataSettingsVariousService) {}

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

  private saveSetting_sub(value: any, dummy: any, type: string) {
    if (value !== dummy) {
      const c = this.settingList.find((x) => x.type === type);
      if (c) {
        this.countSettings(true);
        c.value = value;
        this.dataSettingsVariousService.updateSetting(c).subscribe(() => {
          this.countSettings(false);
        });
      } else {
        const nc = new Setting();
        nc.value = value;
        nc.type = type;
        this.countSettings(true);
        this.dataSettingsVariousService.addSetting(nc).subscribe((x) => {
          this.countSettings(false);
        });
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
