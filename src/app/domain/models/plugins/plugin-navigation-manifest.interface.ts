// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PluginSvgPath } from './plugin-svg-path.interface';

export interface PluginNavigationManifest {
  icon: string;
  route: string;
  labelKey: string;
  position: number;
  viewBox: string;
  svgPaths: PluginSvgPath[];
}
