// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptService } from './script.service';

describe('Comment at the end of the source (mirrors backend StringInputStream.SkipComment)', () => {
  let service: ScriptService;

  beforeEach(() => {
    service = new ScriptService();
  });

  it('runs a script whose last line is a comment without a line break', () => {
    // Arrange
    const source = "output 1, 5\n' trailing comment";

    // Act
    const result = service.run(source, false, true);

    // Assert
    expect(result.success, result.error?.description).toBe(true);
    expect(result.messages[0].message).toBe('5');
  });

  it('compiles a comment that follows a statement on the last line', () => {
    // Arrange
    const source = "output 1, 5 ' trailing comment";

    // Act
    const result = service.run(source, false, true);

    // Assert
    expect(result.success, result.error?.description).toBe(true);
    expect(result.messages[0].message).toBe('5');
  });

  it('compiles a source that is only a comment', () => {
    // Act
    const compiled = service.compile("' only a comment", false, true);

    // Assert
    expect(compiled.hasError, compiled.error?.description).toBe(false);
  });

  it('skips a comment up to a carriage return line feed and goes on in the next line', () => {
    // Arrange
    const source = "output 1, 5 ' note\r\noutput 2, 6";

    // Act
    const result = service.run(source, false, true);

    // Assert
    expect(result.success, result.error?.description).toBe(true);
    expect(result.messages.map((message) => message.message)).toEqual(['5', '6']);
  });

  it('still skips a comment up to the line break and goes on in the next line', () => {
    // Arrange
    const source = "' leading comment\noutput 1, 7";

    // Act
    const result = service.run(source, false, true);

    // Assert
    expect(result.success, result.error?.description).toBe(true);
    expect(result.messages[0].message).toBe('7');
  });
});
