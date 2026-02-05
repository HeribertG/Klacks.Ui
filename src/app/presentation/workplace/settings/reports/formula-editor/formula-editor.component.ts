import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';

import { ScriptService } from 'src/app/infrastructure/scripting/script.service';
import { klacksScriptLanguage, errorExtensions, clearError, setError } from 'src/app/infrastructure/scripting/klacks-script-language';
import { AVAILABLE_DATA_BINDINGS } from 'src/app/domain/models/report/report-field.model';

@Component({
  selector: 'app-formula-editor',
  templateUrl: './formula-editor.component.html',
  styleUrls: ['./formula-editor.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule]
})
export class FormulaEditorComponent implements OnInit, OnDestroy {
  @Input() formula = '';
  @Output() formulaChange = new EventEmitter<string>();
  @Output() testResult = new EventEmitter<{ success: boolean; result?: unknown; error?: string }>();

  private scriptService = inject(ScriptService);

  private editorView: EditorView | null = null;
  private container: HTMLElement | null = null;

  testValue = '';
  lastResult: { success: boolean; result?: unknown; error?: string } | null = null;

  // Available variables for the formula
  availableVariables = AVAILABLE_DATA_BINDINGS;

  // Example formulas
  exampleFormulas = [
    { label: 'Round Hours', code: 'round(work.hours * 25.50, 2)' },
    { label: 'Overtime Check', code: 'iif(work.hours > 8, "Overtime", "Normal")' },
    { label: 'Short Name', code: 'left(client.firstname, 1) + ". " + client.name' },
    { label: 'Total with Surcharge', code: 'work.hours * 25.50 + surcharges' },
    { label: 'Date Format', code: 'day(work.date) + "." + month(work.date) + "." + year(work.date)' },
  ];

  ngOnInit(): void {
    this.initEditor();
  }

  ngOnDestroy(): void {
    this.editorView?.destroy();
  }

  private initEditor(): void {
    this.container = document.getElementById('formula-editor-container');
    if (!this.container) return;

    const state = EditorState.create({
      doc: this.formula,
      extensions: [
        basicSetup,
        klacksScriptLanguage,
        errorExtensions,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.formula = update.state.doc.toString();
            this.formulaChange.emit(this.formula);
            this.validateFormula();
          }
        })
      ]
    });

    this.editorView = new EditorView({
      state,
      parent: this.container
    });
  }

  insertVariable(variable: string): void {
    if (!this.editorView) return;

    const doc = this.editorView.state.doc;
    const selection = this.editorView.state.selection.main;
    const before = doc.sliceString(0, selection.from);
    const after = doc.sliceString(selection.to);

    const newText = before + '{' + variable + '}' + after;
    
    this.editorView.dispatch({
      changes: { from: 0, to: doc.length, insert: newText },
      selection: { anchor: selection.from + variable.length + 2 }
    });
  }

  insertExample(example: string): void {
    if (!this.editorView) return;

    this.editorView.dispatch({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: example }
    });
  }

  private validateFormula(): void {
    if (!this.editorView || !this.formula.trim()) return;

    clearError(this.editorView);

    try {
      // Replace template variables with test values
      const processedFormula = this.preprocessFormula(this.formula);
      const script = this.scriptService.compile(processedFormula, false, true);
      
      // If compilation succeeds without error, it's valid syntax
      // We don't execute here to avoid side effects
    } catch (error: unknown) {
      if (this.editorView && error instanceof Error) {
        // Try to extract position from error message
        const match = error.message.match(/line (\d+)/i);
        if (match) {
          const line = parseInt(match[1], 10) - 1;
          const lineFrom = this.editorView.state.doc.line(line + 1).from;
          const lineTo = this.editorView.state.doc.line(line + 1).to;
          setError(this.editorView, lineFrom, lineTo);
        }
      }
    }
  }

  testFormula(): void {
    if (!this.formula.trim()) {
      this.lastResult = { success: false, error: 'Formula is empty' };
      this.testResult.emit(this.lastResult);
      return;
    }

    try {
      // Replace template variables with test values
      const processedFormula = this.preprocessFormula(this.formula);
      const script = this.scriptService.compile(processedFormula, false, true);
      
      // Set up test variables
      const testVariables = this.getTestVariables();
      
      const result = this.scriptService.execute(script, testVariables);
      
      if (result.success) {
        this.lastResult = { 
          success: true, 
          result: 'Success' // ScriptResult doesn't have value property directly
        };
      } else {
        const errorMessage = result.messages
          .filter(m => m.type === 2) // Error messages
          .map(m => m.message)
          .join('\n');
        this.lastResult = { 
          success: false, 
          error: errorMessage || 'Unknown error'
        };
      }
    } catch (error: unknown) {
      this.lastResult = { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }

    this.testResult.emit(this.lastResult);
  }

  private preprocessFormula(formula: string): string {
    // Replace {variable} syntax with actual variable references
    let processed = formula;
    
    // Replace template variables with safe identifiers
    this.availableVariables.forEach(v => {
      const pattern = new RegExp('\\{' + v.key.replace('.', '\\.') + '\\}', 'g');
      const safeName = v.key.replace('.', '_');
      processed = processed.replace(pattern, safeName);
    });

    return processed;
  }

  private getTestVariables(): Record<string, unknown> {
    return {
      // Work variables
      work_date: '15.02.2026',
      work_day: 'Mo',
      work_starttime: '08:00',
      work_endtime: '17:00',
      work_timerange: '08:00 - 17:00',
      work_hours: 8.5,
      work_information: 'Test work entry',
      
      // Client variables
      client_fullname: 'Max Mustermann',
      client_firstname: 'Max',
      client_name: 'Mustermann',
      
      // Report variables
      report_period: '01.02.2026 - 28.02.2026',
      report_date: '05.02.2026',
      
      // Calculated values
      surcharges: 25.0
    };
  }

  clearFormula(): void {
    if (this.editorView) {
      this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: '' }
      });
    }
    this.lastResult = null;
  }
}
