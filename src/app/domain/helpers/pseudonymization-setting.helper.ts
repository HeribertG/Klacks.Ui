// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the LLM pseudonymisation switch the way the server does (LLMProviderFactory): a missing, empty or unreadable
 * value means on; only a value that parses as the boolean false switches it off.
 */
import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { AppSetting } from 'src/app/domain/models/settings/app-setting-class';

const FALSE_TEXT = 'false';

/**
 * @param settings - The stored setting list (type = key, value = raw string)
 * @returns False only when the stored LLM_PSEUDONYMIZATION_ENABLED value is "false" (case-insensitive), otherwise true
 */
export function isPseudonymizationEnabled(settings: readonly ISetting[]): boolean {
  const setting = settings.find((s) => s.type === AppSetting.LLM_PSEUDONYMIZATION_ENABLED);
  return (setting?.value ?? '').trim().toLowerCase() !== FALSE_TEXT;
}
