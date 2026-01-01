import { StreamLanguage, StringStream, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';

const keywords = new Set([
  'if', 'then', 'else', 'endif', 'end',
  'do', 'while', 'loop', 'until',
  'for', 'to', 'step', 'next',
  'select', 'case',
  'exit',
  'const', 'dim',
  'function', 'endfunction',
  'sub', 'endsub',
  'import', 'external'
]);

const operators = new Set([
  'and', 'or', 'not',
  'andalso', 'orelse',
  'div', 'mod'
]);

const builtinFunctions = new Set([
  'sin', 'cos', 'tan', 'atan',
  'abs', 'round', 'sqr', 'rnd', 'log', 'exp', 'sgn',
  'len', 'left', 'right', 'mid', 'instr', 'replace', 'trim', 'ucase', 'lcase',
  'timetohours', 'timeoverlap',
  'iif', 'msgbox', 'result', 'inputbox', 'doevents',
  'debugprint', 'debugclear', 'debugshow', 'debughide'
]);

const constants = new Set([
  'true', 'false', 'pi',
  'vbcrlf', 'vbtab', 'vbcr', 'vblf'
]);

const externalVariables = new Set([
  'hour', 'fromhour', 'untilhour',
  'weekday', 'holiday', 'holidaynextday',
  'nightrate', 'holidayrate', 'weekendrate',
  'guaranteedhours', 'fulltime'
]);

interface KlacksScriptState {
  tokenize: (stream: StringStream, state: KlacksScriptState) => string | null;
}

function tokenBase(stream: StringStream, state: KlacksScriptState): string | null {
  if (stream.eatSpace()) {
    return null;
  }

  const ch = stream.next();
  if (!ch) {
    return null;
  }

  if (ch === "'") {
    stream.skipToEnd();
    return 'comment';
  }

  if (ch === '"') {
    state.tokenize = tokenString;
    return state.tokenize(stream, state);
  }

  if (/\d/.test(ch as string)) {
    stream.match(/^\d*\.?\d*/);
    return 'number';
  }

  if (/[+\-*\/\\%^!&]/.test(ch as string)) {
    stream.match(/^=/);
    return 'operator';
  }

  if (/[<>=]/.test(ch as string)) {
    stream.match(/^[<>=]/);
    return 'operator';
  }

  if (/[(),:]/.test(ch as string)) {
    return 'punctuation';
  }

  if (/[a-zA-Z_@äöüÄÖÜß]/.test(ch as string)) {
    stream.eatWhile(/[a-zA-Z0-9_@äöüÄÖÜß]/);
    const word = stream.current().toLowerCase();

    if (keywords.has(word)) {
      return 'keyword';
    }
    if (operators.has(word)) {
      return 'operator';
    }
    if (builtinFunctions.has(word)) {
      return 'typeName';
    }
    if (constants.has(word)) {
      return 'atom';
    }
    if (externalVariables.has(word)) {
      return 'propertyName';
    }
    return 'name';
  }

  return null;
}

function tokenString(stream: StringStream, state: KlacksScriptState): string | null {
  let next: string | void;

  while ((next = stream.next())) {
    if (next === '"') {
      if (stream.peek() === '"') {
        stream.next();
      } else {
        state.tokenize = tokenBase;
        break;
      }
    }
  }

  return 'string';
}

const klacksScriptMode = {
  name: 'klacks-script',
  startState: (): KlacksScriptState => ({
    tokenize: tokenBase
  }),
  token: (stream: StringStream, state: KlacksScriptState): string | null => {
    return state.tokenize(stream, state);
  },
  languageData: {
    commentTokens: { line: "'" }
  }
};

const klacksLanguage = StreamLanguage.define(klacksScriptMode);

const klacksHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#0000ff', fontWeight: 'bold' },
  { tag: tags.operator, color: '#666666' },
  { tag: tags.typeName, color: '#795e26' },
  { tag: tags.atom, color: '#0070c1' },
  { tag: tags.number, color: '#098658' },
  { tag: tags.string, color: '#a31515' },
  { tag: tags.comment, color: '#008000', fontStyle: 'italic' },
  { tag: tags.name, color: '#001080' },
  { tag: tags.propertyName, color: '#9c27b0' },
  { tag: tags.punctuation, color: '#000000' }
]);

const setErrorEffect = StateEffect.define<{ from: number; to: number } | null>();

const errorMark = Decoration.mark({
  class: 'cm-error-underline'
});

const errorField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setErrorEffect)) {
        if (effect.value === null) {
          decorations = Decoration.none;
        } else {
          decorations = Decoration.set([
            errorMark.range(effect.value.from, effect.value.to)
          ]);
        }
      }
    }
    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

const errorTheme = EditorView.baseTheme({
  '.cm-error-underline': {
    textDecoration: 'underline wavy red',
    textUnderlineOffset: '3px'
  }
});

export function setError(view: EditorView, from: number, to: number): void {
  view.dispatch({
    effects: setErrorEffect.of({ from, to })
  });
}

export function clearError(view: EditorView): void {
  view.dispatch({
    effects: setErrorEffect.of(null)
  });
}

export const klacksScriptLanguage = [
  klacksLanguage,
  syntaxHighlighting(klacksHighlightStyle)
];

export const errorExtensions = [
  errorField,
  errorTheme
];
