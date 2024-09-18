import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { IMacro } from 'src/app/core/macro-class';
import { IMultiLanguage } from 'src/app/core/multi-language-class';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
  selector: 'app-edit-shift-macro',
  templateUrl: './edit-shift-macro.component.html',
  styleUrls: ['./edit-shift-macro.component.scss'],
})
export class EditShiftMacroComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('macroShiftForm', { static: false }) macroShiftForm:
    | NgForm
    | undefined;

  visibleTable = 'inline';
  currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private macro: IMacro | undefined;
  macroDescription = '';
  objectForUnsubscribe: Subscription | undefined;

  constructor(
    public dataManagementShiftService: DataManagementShiftService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
  }
  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.macroShiftForm!.valueChanges!.subscribe(
      () => {
        if (this.macroShiftForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
          if (!this.dataManagementShiftService.editShift?.macroId) {
            this.macroDescription = '';
          }
        }
      }
    );
  }
  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  onSelectionChange(id: string) {
    this.macro = this.dataManagementShiftService.macroList.find(
      (x) => x.id === id
    );
    this.readCorrectDescription();
  }

  private readCorrectDescription() {
    if (this.macro && this.macro.description) {
      const ml = this.macro.description as IMultiLanguage;
      this.macroDescription = ml[this.currentLang.toString()] as string;
    }
  }
}
