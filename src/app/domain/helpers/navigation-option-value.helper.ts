// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Encodes a navigation destination (route plus optional data-klacksy-target) into the single string
 * value a reply-toast option carries, and decodes it again. The toast tracks and reports options by
 * value only, so two suggestions on the same route (e.g. "Edit settings" and "Manage LLM providers"
 * on /workplace/settings) must differ in their value, which the target does.
 * @param route - Angular route to navigate to
 * @param target - Optional data-klacksy-target of the section to scroll to on that route
 * @param value - Option value produced by toNavigationOptionValue, or a plain route
 */
import { INavigationDestination } from 'src/app/domain/models/assistant/navigation-destination.interface';

const TARGET_SEPARATOR = '#';

export function toNavigationOptionValue(route: string, target?: string): string {
  return target ? `${route}${TARGET_SEPARATOR}${target}` : route;
}

export function parseNavigationOptionValue(value: string): INavigationDestination {
  const separatorIndex = value.indexOf(TARGET_SEPARATOR);
  if (separatorIndex < 0) {
    return { route: value };
  }

  const route = value.slice(0, separatorIndex);
  const target = value.slice(separatorIndex + TARGET_SEPARATOR.length);
  return target ? { route, target } : { route };
}
