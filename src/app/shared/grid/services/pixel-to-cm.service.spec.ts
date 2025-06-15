import { TestBed } from '@angular/core/testing';

import { PixelToCmService } from './pixel-to-cm.service';

describe('PixelToCmService', () => {
  let service: PixelToCmService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PixelToCmService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
