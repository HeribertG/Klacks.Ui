import { ScrollService } from './scroll.service';

describe('ScrollService', () => {
  let service: ScrollService;

  beforeEach(() => {
    service = new ScrollService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set horizontal and vertical scroll values', () => {
    service.maxCols = 10;
    service.maxRows = 10;

    service.hScrollValue = 5;
    expect(service.hScrollValue).toBe(5);

    service.vScrollValue = 10;
    expect(service.vScrollValue).toBe(10);
  });

  it('should reset scroll positions', () => {
    service.hScrollValue = 5;
    service.vScrollValue = 10;
    service.resetScrollPosition();

    expect(service.hScrollValue).toBe(0);
    expect(service.vScrollValue).toBe(0);
  });

  it('should adjust values within bounds', () => {
    service.setMetrics(2, 10, 2, 10);

    service.hScrollValue = 11;
    expect(service.hScrollValue).toBe(9);

    service.vScrollValue = 11;
    expect(service.vScrollValue).toBe(9);
  });

  it('should calculate last differences correctly', () => {
    service.maxCols = 10;
    service.maxRows = 10;

    service.hScrollValue = 5;
    service.vScrollValue = 5;

    service.hScrollValue = 3;
    expect(service.lastDifferenceX).toBe(2);

    service.vScrollValue = 3;
    expect(service.lastDifferenceY).toBe(2);
  });
});
