import { TestBed } from '@angular/core/testing';
import { ContextMenuService } from './context-menu.service';

describe('MenuService', () => {
  let service: ContextMenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContextMenuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
