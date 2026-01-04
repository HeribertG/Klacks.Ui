import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CodeEditorComponent } from '@fsegurai/ngx-codemirror';
import { EditorSelection } from '@codemirror/state';
import { klacksScriptLanguage as klacksScriptExtensions, errorExtensions, setError, clearError } from 'src/app/infrastructure/scripting/klacks-script-language';

import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MacroTypes, MacroTypeLabels } from 'src/app/domain/enums/macro-type.enum';
import { IMacro, Macro } from 'src/app/domain/models/macro-class';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PropertyGridComponent } from '../property-grid/property-grid.component';
import { ShiftData } from 'src/app/domain/models/shift-data-class';
import {
  ScriptService,
  ExternalVariables,
} from 'src/app/infrastructure/scripting/script.service';
import { ScriptResult } from 'src/app/infrastructure/scripting/script-result';
import { MacroManagementService } from 'src/app/domain/services/settings/macro-management.service';

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
export class MacroRowComponent implements OnDestroy {
  @ViewChild('content', { static: true }) contentTemplate!: TemplateRef<unknown>;
  @ViewChild('codemirror') codeEditor!: CodeEditorComponent;
  @Input() data: IMacro = new Macro();
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() cancelNewEvent = new EventEmitter<void>();
  @Output() macroChangedEvent = new EventEmitter<void>();

  private wasSaved = false;
  private destroy$ = new Subject<void>();

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  private scriptService = inject(ScriptService);
  private http = inject(HttpClient);
  private macroManagementService = inject(MacroManagementService);

  macroName = signal('');
  macroType = signal(0);
  obj = signal('');
  description?: MultiLanguage;
  tabId = signal('macro');

  shiftData = new ShiftData();

  test = signal('');
  manualContent = signal('');

  macroTypeOptions = Object.values(MacroTypes)
    .filter((v): v is MacroTypes => typeof v === 'number')
    .map((value) => ({
      value,
      label: MacroTypeLabels[value],
    }));

  klacksScriptLanguage = [...klacksScriptExtensions, ...errorExtensions];

  private readonly AUTO_IMPORTS = [
    'import hour',
    'import fromhour',
    'import untilhour',
    'import weekday',
    'import holiday',
    'import holidaynextday',
    'import nightrate',
    'import holidayrate',
    'import weekendrate',
    'import guaranteedhours',
    'import fulltime'
  ];

  private stripImports(code: string): string {
    if (!code) return '';
    return code
      .split('\n')
      .filter(line => !line.trim().toLowerCase().startsWith('import '))
      .join('\n')
      .trim();
  }

  private addImports(code: string): string {
    if (!code) return this.AUTO_IMPORTS.join('\n');
    return this.AUTO_IMPORTS.join('\n') + '\n\n' + code;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onChange(): void {
    if (
      this.data &&
      (this.data.isDirty === undefined ||
        this.data.isDirty === CreateEntriesEnum.undefined)
    ) {
      this.data.isDirty = CreateEntriesEnum.rewrite;
    }
    this.macroChangedEvent.emit();
  }

  open(content: unknown): void {
    this.openModalInternal(content);
  }

  openModal(): void {
    this.openModalInternal(this.contentTemplate);
  }

  private openModalInternal(content: unknown): void {
    if (this.data) {
      this.macroName.set(this.data.name || '');
      this.macroType.set(this.data.type);
      this.obj.set(this.stripImports(this.data.content || ''));
      this.description = this.data.description;
    }

    this.wasSaved = false;
    this.tabId.set('macro');
    this.test.set('');
    this.loadManual();

    this.modalService.open(content, { size: 'lg', centered: true }).result.then(
      () => {
        if (this.data) {
          this.data.name = this.macroName();
          this.data.type = +this.macroType();
          this.data.content = this.addImports(this.obj());
          this.data.description = this.description;
        }

        this.wasSaved = true;
        this.onChange();
        this.macroManagementService.save();
      },
      () => {
        if (!this.wasSaved && this.data.isDirty === CreateEntriesEnum.new) {
          this.cancelNewEvent.emit();
        }
      }
    );
  }

  onClickData(): void {
    this.tabId.set('data');
    const codemirror = document.getElementById('codemirror1');
    if (codemirror) {
      codemirror.focus();
    }
  }

  onSave(): void {
    if (this.data) {
      this.data.name = this.macroName();
      this.data.type = +this.macroType();
      this.data.content = this.addImports(this.obj());
      this.data.description = this.description;
    }
    this.wasSaved = true;
    this.onChange();
    this.macroManagementService.save();
  }

  onCheckMacro(): void {
    const code = this.obj();
    if (!code) {
      this.test.set('No macro code to check');
      return;
    }

    const compiled = this.scriptService.compile(code, false, true);
    if (compiled.hasError) {
      const line = compiled.error?.line ?? 1;
      const column = compiled.error?.column ?? 1;
      this.test.set(`Compile Error:\n${compiled.error?.description ?? 'Unknown error'}\nLine: ${line}, Column: ${column}`);
      this.setCursorPosition(line, column);
    } else {
      this.test.set('Syntax OK');
      this.clearErrorMark();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setCursorPosition(line: number, column: number): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = (this.codeEditor as any)?.view;
    if (!view) return;

    const code = this.obj();
    const lines = code.split('\n');
    let pos = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }
    pos += Math.max(0, column - 1);
    pos = Math.min(pos, code.length);

    const lineEnd = line <= lines.length ? pos + (lines[line - 1]?.length ?? 0) - (column - 1) : pos + 1;
    const errorEnd = Math.min(lineEnd, code.length);

    view.dispatch({
      selection: EditorSelection.cursor(pos),
      scrollIntoView: true,
    });
    setError(view, pos, Math.max(pos + 1, errorEnd));
    view.focus();
  }

  private clearErrorMark(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = (this.codeEditor as any)?.view;
    if (!view) return;
    clearError(view);
  }

  onRunMacro(): void {
    const code = this.obj();
    if (!code) {
      this.test.set('No macro code to run');
      return;
    }

    const codeWithImports = this.addImports(code);
    const importLineCount = this.AUTO_IMPORTS.length + 1;
    const externalVars = this.buildExternalVariables();
    const result: ScriptResult = this.scriptService.run(
      codeWithImports,
      false,
      true,
      externalVars
    );
    if (result.success) {
      const messages = result.messages
        .map((m) => `[${m.type}] ${m.message}`)
        .join('\n');
      this.test.set(messages || 'Script executed successfully (no output)');
      this.clearErrorMark();
    } else {
      const adjustedLine = Math.max(1, (result.error?.line ?? 0) - importLineCount);
      const column = result.error?.column ?? 1;
      this.test.set(`Runtime Error:\n${result.error?.description ?? 'Unknown error'}\nLine: ${adjustedLine}, Column: ${column}`);
      this.setCursorPosition(adjustedLine, column);
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
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (content) => {
          this.manualContent.set(content);
        },
        error: () => {
          this.http
            .get('assets/docs/macro-manual/de.html', { responseType: 'text' })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (content) => {
                this.manualContent.set(content);
              },
              error: () => {
                this.manualContent.set('<p>Manual not available</p>');
              },
            });
        },
      });
  }
}
