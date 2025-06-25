import { inject, Injectable, signal } from '@angular/core';
import { ISetting, Setting } from 'src/app/core/settings-various-class';
import { DataSettingsVariousService } from 'src/app/data/data-settings-various.service';
import { cloneObject } from 'src/app/helpers/object-helpers';
import { ConstantKeys } from '../constants/constants';
import { PixelToPtService } from './pixel-to-pt.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GridFontsService {
  private dataSettingsVariousService = inject(DataSettingsVariousService);
  private pixelToPt = inject(PixelToPtService);

  public isReset = signal(false);
  public isChangingEvent = new Subject<boolean>();

  public settingList: ISetting[] = [];
  private settingListDummy: ISetting[] = [];

  private _zoom = 1;
  private weight = '350 ';
  private fontName = 'system-ui';
  private point = 'pt ';

  private headerFontPoint = 11;
  private mainFontPoint = 11;
  private firstSubFontPoint = 9;
  private secondSubFontPoint = 9;
  private baselineReducer = 0.8;
  private symbolFontPoint = 12;

  public mainFontName = this.fontName;
  public firstSubFontName = this.fontName;
  public secondSubFontName = this.fontName;
  public headerFontName = this.fontName;
  public symbolFontName = this.fontName;

  public mainFontSize = this.mainFontPoint.toString();
  public headerFontSize = this.headerFontPoint.toString();
  public firstSubFontSize = this.firstSubFontPoint.toString();
  public secondSubFontSize = this.secondSubFontPoint.toString();
  public symbolFontSize = this.symbolFontPoint.toString();

  private mainFontHeight = this.pixelToPt.pointToPixel(this.headerFontPoint);
  private headerFontHeight = this.pixelToPt.pointToPixel(this.headerFontPoint);
  private firstSubFontHeight = this.pixelToPt.pointToPixel(
    this.firstSubFontPoint
  );
  private secondSubFontHeight = this.pixelToPt.pointToPixel(
    this.secondSubFontPoint
  );
  private symbolFontHeight = +this.pixelToPt
    .pointToPixel(this.symbolFontPoint)
    .toFixed(2);

  public get mainFontHeightZoom(): number {
    return +this.pixelToPt
      .pointToPixel(this.mainFontHeight * this._zoom * this.baselineReducer)
      .toFixed(2);
  }
  public get headerFontHeightZoom(): number {
    return +this.pixelToPt
      .pointToPixel(this.headerFontHeight * this._zoom * this.baselineReducer)
      .toFixed(2);
  }

  public get firstSubFontHeightZoom(): number {
    return +this.pixelToPt
      .pointToPixel(this.firstSubFontHeight * this._zoom * this.baselineReducer)
      .toFixed(2);
  }

  public get secondSubFontHeightZoom(): number {
    return +this.pixelToPt
      .pointToPixel(
        this.secondSubFontHeight * this._zoom * this.baselineReducer
      )
      .toFixed(2);
  }

  public get symbolFontHeightZoom(): number {
    return +this.pixelToPt
      .pointToPixel(this.symbolFontPoint * this._zoom * this.baselineReducer)
      .toFixed(2);
  }

  public get mainFontSizeZoom(): string {
    return (this.headerFontPoint * this._zoom).toFixed(2);
  }
  public get headerFontSizeZoom(): string {
    return (this.headerFontPoint * this._zoom).toFixed(2);
  }

  public get firstSubFontSizeZoom(): string {
    return (this.firstSubFontPoint * this._zoom).toFixed(2);
  }

  public get secondSubFontSizeZoom(): string {
    return (this.secondSubFontPoint * this._zoom).toFixed(2);
  }

  public get mainFontString(): string {
    return this.weight + this.mainFontSize + this.point + this.mainFontName;
  }

  public get headerFontString(): string {
    return this.weight + this.headerFontSize + this.point + this.headerFontName;
  }

  public get firstSubFontString(): string {
    return (
      this.weight + this.firstSubFontSize + this.point + this.firstSubFontName
    );
  }

  public get secondSubFontString(): string {
    return (
      this.weight + this.secondSubFontSize + this.point + this.secondSubFontName
    );
  }

  private settingsCount = 0;

  public set zoom(value: number) {
    this._zoom = value;
  }

  public get mainFontStringZoom(): string {
    return (
      this.weight +
      this.headerFontPoint * this._zoom +
      this.point +
      this.mainFontName
    );
  }

  public get headerFontStringZoom(): string {
    return (
      this.weight +
      this.headerFontPoint * this._zoom +
      this.point +
      this.headerFontName
    );
  }

  public get symbolFontStringZoom(): string {
    return (
      '900 ' +
      this.symbolFontPoint * this._zoom +
      this.point +
      this.symbolFontName
    );
  }

  public get firstSubFontStringZoom(): string {
    return (
      this.weight +
      this.firstSubFontPoint * this._zoom +
      this.point +
      this.firstSubFontName
    );
  }

  public get secondSubFontStringZoom(): string {
    return (
      this.weight +
      this.secondSubFontPoint * this._zoom +
      this.point +
      this.secondSubFontName
    );
  }

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
        this.isChangingEvent.next(false);
        setTimeout(() => this.isReset.set(false), 100);
      }
    });
  }

  private resetSettingList(): void {
    this.settingList.push(
      this.resetSettingListSub(
        this.mainFontName,
        ConstantKeys.MAIN_FONT_NAME_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.firstSubFontName,
        ConstantKeys.FIRST_SUB_FONT_NAME_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.secondSubFontName,
        ConstantKeys.SECOND_SUB_FONT_NAME_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.mainFontSize,
        ConstantKeys.MAIN_FONT_SIZE_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.firstSubFontSize,
        ConstantKeys.FIRST_SUB_FONT_SIZE_KEY
      )
    );
    this.settingList.push(
      this.resetSettingListSub(
        this.secondSubFontSize,
        ConstantKeys.SECOND_SUB_FONT_SIZE_KEY
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
      case ConstantKeys.MAIN_FONT_NAME_KEY:
        this.mainFontName = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.MAIN_FONT_SIZE_KEY:
        this.mainFontSize = value.value;
        this.mainFontPoint = +value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.FIRST_SUB_FONT_NAME_KEY:
        this.firstSubFontName = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.FIRST_SUB_FONT_SIZE_KEY:
        this.firstSubFontSize = value.value;
        this.firstSubFontPoint = +value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.SECOND_SUB_FONT_NAME_KEY:
        this.secondSubFontName = value.value;
        this.setCurrentSetting(value);
        break;
      case ConstantKeys.SECOND_SUB_FONT_SIZE_KEY:
        this.secondSubFontSize = value.value;
        this.secondSubFontPoint = +value.value;
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
      this.saveSetting_sub(x.value, dummy?.value, x);
    });
  }

  private saveSetting_sub(
    value: string,
    dummy: string | undefined,
    c: ISetting
  ) {
    if (value !== dummy) {
      if (c.id) {
        this.countSettings(true);
        this.dataSettingsVariousService.updateSetting(c).subscribe(() => {
          this.countSettings(false);
        });
      } else {
        const nc = new Setting();
        delete c.id;
        nc.value = value;
        nc.type = c.type;
        this.countSettings(true);
        this.dataSettingsVariousService.addSetting(nc).subscribe(() => {
          this.countSettings(false);
        });
      }
    }
  }

  isSetting_Dirty(): boolean {
    let result = false;
    this.settingList.forEach((x) => {
      const dummy = this.settingListDummy.find((y) => y.id === x.id);
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
