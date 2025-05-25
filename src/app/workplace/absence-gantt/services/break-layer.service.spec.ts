import { TestBed } from '@angular/core/testing';

import { BreakLayerService } from './break-layer.service';

describe('BreakLayerService', () => {
  let service: BreakLayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BreakLayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
