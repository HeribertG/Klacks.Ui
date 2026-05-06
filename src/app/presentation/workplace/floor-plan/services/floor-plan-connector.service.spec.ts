// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for pure-math methods in FloorPlanConnectorService.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FloorPlanConnectorService } from './floor-plan-connector.service';

describe('FloorPlanConnectorService', () => {
  let service: FloorPlanConnectorService;

  beforeEach(() => {
    service = new FloorPlanConnectorService();
  });

  it('should instantiate', () => {
    expect(service).toBeTruthy();
  });
});
