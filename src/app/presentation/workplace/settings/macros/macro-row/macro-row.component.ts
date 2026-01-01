/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CodeEditorComponent } from '@fsegurai/ngx-codemirror';
import { klacksScriptLanguage } from 'src/app/infrastructure/scripting/klacks-script-language';

import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { IMacro, Macro } from 'src/app/domain/models/macro-class';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { Subscription } from 'rxjs';
import { PropertyGridComponent } from '../property-grid/property-grid.component';
import { ShiftData } from 'src/app/domain/models/shift-data-class';
import {
  ScriptService,
  ExternalVariables,
} from 'src/app/infrastructure/scripting/script.service';
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
  @ViewChild('content', { static: true }) contentTemplate!: TemplateRef<unknown>;
  @Input() data: IMacro = new Macro();
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() cancelNewEvent = new EventEmitter<void>();

  private wasSaved = false;

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

  klacksScriptLanguage = klacksScriptLanguage;

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
    this.openModalInternal(content);
  }

  openModal(): void {
    this.openModalInternal(this.contentTemplate);
  }

  private openModalInternal(content: any): void {
    if (this.data) {
      this.macroName = this.data.name || '';
      this.macroType = this.data.type;
      this.obj = this.data.content || '';
      this.description = this.data.description;
    }

    this.wasSaved = false;
    this.loadManual();

    this.modalService.open(content, { size: 'lg', centered: true }).result.then(
      () => {
        if (this.data) {
          this.data.name = this.macroName;
          this.data.type = +this.macroType;
          this.data.content = this.obj;
          this.data.description = this.description;
        }

        this.wasSaved = true;
        this.onChange(true);
      },
      () => {
        if (!this.wasSaved && this.data.isDirty === CreateEntriesEnum.new) {
          this.cancelNewEvent.emit();
        }
      }
    );
  }

  onClickData(): void {
    this.tabId = 'data';
    const codemirror = document.getElementById('codemirror1');
    if (codemirror) {
      codemirror.focus();
    }
  }

  onSave(): void {
    if (this.data) {
      this.data.name = this.macroName;
      this.data.type = +this.macroType;
      this.data.content = this.obj;
      this.data.description = this.description;
    }
    this.wasSaved = true;
    this.onChange(true);
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

    const compiled = this.scriptService.compile(this.obj, false, true);
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

    const externalVars = this.buildExternalVariables();
    const result: ScriptResult = this.scriptService.run(
      this.obj,
      false,
      true,
      externalVars
    );
    if (result.success) {
      const messages = result.messages
        .map((m) => `[${m.type}] ${m.message}`)
        .join('\n');
      this.test = messages || 'Script executed successfully (no output)';
    } else {
      this.test = `Runtime Error:\n${result.error?.description ?? 'Unknown error'}\nLine: ${result.error?.line ?? 0}, Column: ${result.error?.column ?? 0}`;
    }
  }

  private buildExternalVariables(): ExternalVariables {
    return { ...this.shiftData };
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
