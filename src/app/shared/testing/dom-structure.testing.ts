// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Spec-only helpers that turn a rendered DOM subtree into stable lines (depth, tag, id, sorted classes, relevant
 * attributes, own text) so characterization specs can pin a template's structure across component splits.
 * @param root - Element whose descendants are serialized (the root itself is left out)
 * @param transparentTags - Lower-case host tags of extracted child components; they are skipped and their
 * children are serialized at the host's depth, so a split that only adds `display: contents` hosts keeps the lines
 */

const IGNORED_ATTRIBUTE_PREFIXES = ['_ngcontent', '_nghost', 'ng-reflect', 'ng-version'];
const IGNORED_ATTRIBUTES = new Set(['class', 'id']);
const INDENT = '  ';

const ownText = (element: Element): string =>
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const describeAttributes = (element: Element): string =>
  Array.from(element.attributes)
    .filter(
      (attribute) =>
        !IGNORED_ATTRIBUTES.has(attribute.name) &&
        !IGNORED_ATTRIBUTE_PREFIXES.some((prefix) => attribute.name.startsWith(prefix)),
    )
    .map((attribute) => `${attribute.name}=${attribute.value}`)
    .sort()
    .join(' ');

const describeElement = (element: Element, depth: number): string => {
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList)
    .sort()
    .map((name) => `.${name}`)
    .join('');
  const attributes = describeAttributes(element);
  const text = ownText(element);
  return [
    `${INDENT.repeat(depth)}${element.tagName.toLowerCase()}${id}${classes}`,
    attributes ? `[${attributes}]` : '',
    text ? `"${text}"` : '',
  ]
    .filter((part) => part.length > 0)
    .join(' ');
};

const collect = (element: Element, depth: number, transparentTags: ReadonlySet<string>, lines: string[]): void => {
  for (const child of Array.from(element.children)) {
    if (transparentTags.has(child.tagName.toLowerCase())) {
      collect(child, depth, transparentTags, lines);
      continue;
    }
    lines.push(describeElement(child, depth));
    collect(child, depth + 1, transparentTags, lines);
  }
};

export const serializeDomStructure = (root: Element, transparentTags: ReadonlySet<string> = new Set()): string[] => {
  const lines: string[] = [];
  collect(root, 0, transparentTags, lines);
  return lines;
};

export const collectElementIds = (root: Element): string[] =>
  Array.from(root.querySelectorAll('[id]')).map((element) => element.id);
