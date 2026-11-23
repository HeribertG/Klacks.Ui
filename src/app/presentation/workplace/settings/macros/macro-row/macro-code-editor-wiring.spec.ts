// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CodeEditorComponent } from '@fsegurai/ngx-codemirror';
import { EditorView } from '@codemirror/view';

import { klacksScriptLanguage, errorExtensions } from './klacks-script-language';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CodeEditorComponent],
  template: `
    <ngx-code-editor
      #codemirror
      [ngModel]="editorContent()"
      (ngModelChange)="editorContent.set($event)"
      [autoFocus]="true"
      [extensions]="extensions"
      [lineWrapping]="true"
      name="codemirror"
    >
    </ngx-code-editor>
  `,
})
class MacroCodeEditorHostComponent {
  readonly editorContent = signal('dim x as integer');
  readonly extensions = [...klacksScriptLanguage, ...errorExtensions];
  readonly codeEditor = viewChild<CodeEditorComponent>('codemirror');
}

describe('Macro code editor wiring (ngx-codemirror contract)', () => {
  let fixture: ComponentFixture<MacroCodeEditorHostComponent>;
  let host: MacroCodeEditorHostComponent;

  const editorView = (): EditorView => {
    const view = host.codeEditor()?.view();
    if (!view) {
      throw new Error('The editor view was not created');
    }
    return view;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MacroCodeEditorHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(MacroCodeEditorHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should expose the editor view and show the bound macro text', () => {
    // Assert
    expect(editorView().state.doc.toString()).toBe('dim x as integer');
  });

  it('should push a programmatic change of the macro text into the editor', async () => {
    // Act
    host.editorContent.set('dim y as integer');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Assert
    expect(editorView().state.doc.toString()).toBe('dim y as integer');
  });

  it('should report a user edit through ngModelChange', async () => {
    // Arrange
    const view = editorView();

    // Act
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: 'dim z as integer' },
      userEvent: 'input.type',
    });
    await fixture.whenStable();

    // Assert
    expect(host.editorContent()).toBe('dim z as integer');
  });
});
