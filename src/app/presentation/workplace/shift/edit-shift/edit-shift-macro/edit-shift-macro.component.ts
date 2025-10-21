import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { IMacro } from 'src/app/domain/models/macro-class';
import { IMultiLanguage } from 'src/app/domain/models/multi-language-class';
import { ShiftStatus } from 'src/app/domain/models/shift-class';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { RichTextEditorComponent } from 'src/app/presentation/shared/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-edit-shift-macro',
  templateUrl: './edit-shift-macro.component.html',
  styleUrls: ['./edit-shift-macro.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    RichTextEditorComponent,
  ],
})
export class EditShiftMacroComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  dataManagementShiftService = inject(DataManagementShiftService);
  private translateService = inject(TranslateService);

  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('macroShiftForm', { static: false }) macroShiftForm:
    | NgForm
    | undefined;

  visibleTable = 'inline';
  currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private macro: IMacro | undefined;
  macroDescription = '';
  objectForUnsubscribe: Subscription | undefined;

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    
    // Auto-collapse when shift status is IsCut
    if (this.dataManagementShiftService.editShift?.status === ShiftStatus.IsCut) {
      this.visibleTable = 'none';
    }
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

  get isFieldsDisabled(): boolean {
    return this.dataManagementShiftService.editShift?.status === ShiftStatus.IsCut;
  }

  private readCorrectDescription() {
    if (this.macro && this.macro.description) {
      const ml = this.macro.description as IMultiLanguage;
      this.macroDescription = ml[this.currentLang.toString()] as string;
    }
  }
}
