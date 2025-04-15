import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogInScreenComponent } from './log-in-screen.component';

describe('LogInScreenComponent', () => {
  let component: LogInScreenComponent;
  let fixture: ComponentFixture<LogInScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogInScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogInScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
