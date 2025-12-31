/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CodeEditorComponent } from '@fsegurai/ngx-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { vbScript } from '@codemirror/legacy-modes/mode/vbscript';

import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { IMacro, Macro } from 'src/app/domain/models/macro-class';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { Subscription } from 'rxjs';
import { PropertyGridComponent } from '../property-grid/property-grid.component';
import { ShiftData } from 'src/app/domain/models/shift-data-class';
import { ScriptService } from 'src/app/infrastructure/scripting/script.service';
import { ScriptResult } from 'src/app/infrastructure/scripting/script-result';

@Component({
  selector: 'app-macro-row',
  templateUrl: './macro-row.component.html',
  styleUrls: ['./macro-row.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    CodeEditorComponent,
    PropertyGridComponent,
  ],
})
export class MacroRowComponent implements OnInit, OnDestroy {
  @ViewChild(NgForm, { static: false }) macroForm: NgForm | undefined;
  @Input() data: IMacro = new Macro();
  @Output() isDeleteEvent = new EventEmitter<void>();

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  private scriptService = inject(ScriptService);
  private http = inject(HttpClient);

  macroName = '';
  macroType = 0;
  macroKey = 0;
  obj = '';
  description?: MultiLanguage;
  tabId = 'macro';
  currentData = '';
  myData: any;

  shiftData = new ShiftData();

  test = '';
  manualContent = '';

  private formSubscription?: Subscription;

  isReadOwnerDefinedValues = false;
  isReadStatusTemplateList = false;
  isReadSectionTemplateList = false;

  // CodeMirror configuration is now handled via component properties
  vbScriptLanguage = StreamLanguage.define(vbScript);

  dialogRef: any;

  ngOnInit(): void {
    if (this.macroForm?.valueChanges) {
      this.formSubscription = this.macroForm.valueChanges.subscribe(() => {
        if (this.macroForm?.dirty) {
          this.onChange(true);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChange(event: boolean): void {
    if (
      this.data &&
      (this.data.isDirty === undefined ||
        this.data.isDirty === CreateEntriesEnum.undefined)
    ) {
      this.data.isDirty = CreateEntriesEnum.rewrite;
    }
  }

  open(content: any): void {
    if (this.data) {
      this.macroName = this.data.name || '';
      this.macroType = this.data.type;
      this.obj = this.data.content || '';
      this.description = this.data.description;
    }

    this.loadManual();

    this.modalService.open(content, { size: 'lg', centered: true }).result.then(
      () => {
        if (this.data) {
          this.data.name = this.macroName;
          this.data.type = +this.macroType;
          this.data.content = this.obj;
          this.data.description = this.description;
        }

        this.onChange(true);
      },
      () => {} // Dismiss handler
    );
  }

  onClickData(): void {
    this.tabId = 'data';
    const codemirror = document.getElementById('codemirror1');
    if (codemirror) {
      codemirror.focus();
    }
  }

  private macroFilter(): void {
    this.currentData = JSON.stringify(this.myData);

    this.currentData = this.currentData.split('{').join('{\n\t');
    this.currentData = this.currentData.split(',').join(',\n\t');
    this.currentData = this.currentData.split('}').join('\n}');
  }

  onCheckMacro(): void {
    if (!this.obj) {
      this.test = 'No macro code to check';
      return;
    }

    const compiled = this.scriptService.compile(this.obj, false, false);
    if (compiled.hasError) {
      this.test = `Compile Error:\n${compiled.error?.description ?? 'Unknown error'}\nLine: ${compiled.error?.line ?? 0}, Column: ${compiled.error?.column ?? 0}`;
    } else {
      this.test = 'Syntax OK';
    }
  }

  onRunMacro(): void {
    if (!this.obj) {
      this.test = 'No macro code to run';
      return;
    }

    const result: ScriptResult = this.scriptService.run(this.obj, false, false);
    if (result.success) {
      const messages = result.messages.map(m => `[${m.type}] ${m.message}`).join('\n');
      this.test = messages || 'Script executed successfully (no output)';
    } else {
      this.test = `Runtime Error:\n${result.error?.description ?? 'Unknown error'}\nLine: ${result.error?.line ?? 0}, Column: ${result.error?.column ?? 0}`;
    }
  }

  loadManual(): void {
    const lang = this.translate.currentLang || 'de';
    const supportedLangs = ['de', 'en', 'fr', 'it'];
    const effectiveLang = supportedLangs.includes(lang) ? lang : 'de';

    this.http
      .get(`assets/docs/macro-manual/${effectiveLang}.html`, { responseType: 'text' })
      .subscribe({
        next: (content) => {
          this.manualContent = content;
        },
        error: () => {
          this.http
            .get('assets/docs/macro-manual/de.html', { responseType: 'text' })
            .subscribe({
              next: (content) => {
                this.manualContent = content;
              },
              error: () => {
                this.manualContent = '<p>Manual not available</p>';
              },
            });
        },
      });
  }
}
