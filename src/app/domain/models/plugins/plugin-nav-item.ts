// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Navigation item provided by a feature plugin for the sidebar.
 * @param name - Unique plugin identifier matching the manifest name
 * @param route - Router path for navigation (e.g. "/workplace/messaging")
 * @param labelKey - i18n translation key for the tooltip
 * @param position - Sort order in the sidebar plugin section
 * @param viewBox - SVG viewBox attribute (e.g. "0 0 24 24")
 * @param svgPaths - Array of SVG path definitions with optional opacity
 */

import { PluginSvgPath } from './plugin-svg-path.interface';
export interface PluginNavItem {
  name: string;
  route: string;
  labelKey: string;
  position: number;
  viewBox: string;
  svgPaths: PluginSvgPath[];
}
