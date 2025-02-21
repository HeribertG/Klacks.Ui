import { Injectable, signal } from '@angular/core';
import { ISetting, Setting } from 'src/app/core/settings-various-class';
import { DataSettingsVariousService } from 'src/app/data/data-settings-various.service';
import { cloneObject } from 'src/app/helpers/object-helpers';
import { ConstantKeys } from '../constants/constants';

@Injectable({
  providedIn: 'root',
})
export class GridColorService {
  public isReset = signal(false);

  settingList: ISetting[] = [];

  backGroundColor = '#f2eded';
  backGroundColorSaturday = '#F5F5DC';
  backGroundColorHolyday = '#82E0AA'; // green
  backGroundColorSunday = '#95b9d0';
  backGroundColorOfficiallyHoliday = '#48C9B0'; //darkgreen
  borderColor = '#abad94';
  boundaryBorderColor = '#424949';
  mainFontColor = '#000000';
  subFontColor = '#404040';
  foreGroundColor = '#000000';
  controlBackGroundColor = '#D5DBDB';
  headerBackGroundColor = '#FFFFFF';
  headerForeGroundColor = '#4d4d4d';
  focusBorderColor = '#1E90FF';
  evenMonthColor = this.backGroundColor;
  oddMonthColor = '#dad7d7';
  borderColorEndMonth = '#566573';
  backGroundContainerColor = '#424949';
  toolTipBackGroundColor = '#ffffcc';
  scrollTrack = '#A9A9A9';

  private settingListDummy: ISetting[] = [];

  private settingsCount = 0;

  constructor(private dataSettingsVariousService: DataSettingsVariousService) {}

  areObjectsDirty(): boolean {
    if (this.isSetting_Dirty()) {
      return true;
    }

    return false;
  }

  readData(): void {
    this.readSettingList();
  }

  resetData() {
    this.readData();
  }

  save() {
    this.saveSetting();
  }

  private readSettingList() {
    this.dataSettingsVariousService.readSettingList().subscribe((l) => {
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
      }
    });
  }

  private resetSettingList(): void {
    this.settingList.push(
      this.resetSettingListSub(
        this.backGroundColorHolyday,
        ConstantKeys.BACKGROUND_COLOR_HOLIDAY_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.backGroundColor,
        ConstantKeys.BACKGROUND_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.backGroundColorOfficiallyHoliday,
        ConstantKeys.BACKGROUND_COLOR_OFFICIALLY_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.backGroundColorSaturday,
        ConstantKeys.BACKGROUND_COLOR_SATURDAY_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.backGroundColorSunday,
        ConstantKeys.BACKGROUND_COLOR_SUNDAY_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(this.borderColor, ConstantKeys.BORDER_COLOR_KEY)
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.evenMonthColor,
        ConstantKeys.EVEN_MONTH_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.mainFontColor,
        ConstantKeys.MAIN_TEXT_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.oddMonthColor,
        ConstantKeys.ODD_MONTH_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.subFontColor,
        ConstantKeys.SUB_TEXT_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.foreGroundColor,
        ConstantKeys.FOREGROUND_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.controlBackGroundColor,
        ConstantKeys.CONTROL_BACKGROUND_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.headerBackGroundColor,
        ConstantKeys.HEADER_BACKGROUND_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.headerForeGroundColor,
        ConstantKeys.HEADER_FOREGROUND_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.focusBorderColor,
        ConstantKeys.FOCUS_BORDER_COLOR_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.borderColorEndMonth,
        ConstantKeys.BORDER_END_MONTH_COLOR_KEY
      )
    );
  }
  private resetSettingListSub(value: string, type: string): Setting {
    const s = new Setting();
    s.value = value;
    s.type = type;

    return s;
  }

  private setSetting(value: ISetting) {
    switch (value.type) {
      case ConstantKeys.BACKGROUND_COLOR_HOLIDAY_KEY:
        this.backGroundColorHolyday = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.BACKGROUND_COLOR_KEY:
        this.backGroundColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.BACKGROUND_COLOR_OFFICIALLY_KEY:
        this.backGroundColorOfficiallyHoliday = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.BACKGROUND_COLOR_SATURDAY_KEY:
        this.backGroundColorSaturday = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.BACKGROUND_COLOR_SUNDAY_KEY:
        this.backGroundColorSunday = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.BORDER_COLOR_KEY:
        this.borderColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.EVEN_MONTH_COLOR_KEY:
        this.evenMonthColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.MAIN_TEXT_COLOR_KEY:
        this.mainFontColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.ODD_MONTH_COLOR_KEY:
        this.oddMonthColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.SUB_TEXT_COLOR_KEY:
        this.subFontColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.FOREGROUND_COLOR_KEY:
        this.foreGroundColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.CONTROL_BACKGROUND_COLOR_KEY:
        this.controlBackGroundColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.HEADER_BACKGROUND_COLOR_KEY:
        this.headerBackGroundColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.HEADER_FOREGROUND_COLOR_KEY:
        this.headerForeGroundColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.FOCUS_BORDER_COLOR_KEY:
        this.focusBorderColor = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.BORDER_END_MONTH_COLOR_KEY:
        this.borderColorEndMonth = value.value;
        this.setCurrentSetting(value);
        break;
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
      this.saveSetting_sub(x.value, dummy?.value!, x);
    });
  }

  private saveSetting_sub(value: string, dummy: string, c: ISetting) {
    if (value !== dummy) {
      if (c.id) {
        this.countSettings(true);
        this.dataSettingsVariousService.updateSetting(c).subscribe((x) => {
          this.countSettings(false);
        });
      } else {
        const nc = new Setting();
        delete c.id;
        nc.value = value;
        nc.type = c.type;
        this.countSettings(true);
        this.dataSettingsVariousService.addSetting(nc).subscribe((x) => {
          this.countSettings(false);
        });
      }
    }
  }

  isSetting_Dirty(): boolean {
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
}
