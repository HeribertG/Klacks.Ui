// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Navigation item provided by a feature plugin for the sidebar.
 * @param name - Unique plugin identifier matching the manifest name
 * @param route - Router path for navigation (e.g. "/workplace/messaging")
 * @param labelKey - i18n translation key for the tooltip
 * @param position - Sort order in the sidebar plugin section
 * @param viewBox - SVG viewBox attribute (e.g. "0 0 24 24")
 * @param svgPaths - Array of SVG path definitions with optional opacity
 */
export interface PluginNavItem {
  name: string;
  route: string;
  labelKey: string;
  position: number;
  viewBox: string;
  svgPaths: PluginSvgPath[];
}

export interface PluginSvgPath {
  d: string;
  opacity?: string;
}

export interface PluginNavigationManifest {
  icon: string;
  route: string;
  labelKey: string;
  position: number;
  viewBox: string;
  svgPaths: PluginSvgPath[];
}
