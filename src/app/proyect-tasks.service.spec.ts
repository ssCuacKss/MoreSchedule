import { TestBed } from '@angular/core/testing';

import { dbDAO } from './dbDAO';

describe('dbDAO', () => {
  let service: dbDAO;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(dbDAO);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
