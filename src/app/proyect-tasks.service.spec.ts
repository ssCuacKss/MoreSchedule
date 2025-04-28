import { TestBed } from '@angular/core/testing';

import { ProyectTasksService } from './proyect-tasks.service';

describe('ProyectTasksService', () => {
  let service: ProyectTasksService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProyectTasksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
