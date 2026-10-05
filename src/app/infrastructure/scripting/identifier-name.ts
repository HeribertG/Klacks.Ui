// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Normalizes a script identifier for case-insensitive lookups with the semantics of the backend engine, which
 * compares names with .NET StringComparison.OrdinalIgnoreCase (Klacks.Api Scope, Scopes, CompiledScript).
 * OrdinalIgnoreCase upper-cases each character on its own and never changes the length, so a character keeps
 * its form when its upper case would expand (ß stays ß, never SS) and non-ASCII characters never fold onto
 * ASCII (dotless ı and long ſ stay distinct from I and S; dotted İ stays distinct from i).
 * @param name - Identifier as written in the script or passed as an external variable name
 */
export function normalizeIdentifierName(name: string): string {
  let normalized = '';
  for (const character of name) {
    normalized += upperCaseWithoutExpansion(character);
  }
  return normalized;
}

const ASCII_MAX_CODE_POINT = 0x7f;

function upperCaseWithoutExpansion(character: string): string {
  const upper = character.toUpperCase();
  const upperCodePoints = Array.from(upper);
  if (upperCodePoints.length !== 1) {
    return character;
  }

  const isNonAsciiFoldingOntoAscii =
    (character.codePointAt(0) ?? 0) > ASCII_MAX_CODE_POINT &&
    (upper.codePointAt(0) ?? 0) <= ASCII_MAX_CODE_POINT;
  return isNonAsciiFoldingOntoAscii ? character : upper;
}
