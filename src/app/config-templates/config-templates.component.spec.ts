import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigTemplatesComponent } from './config-templates.component';

describe('ConfigTemplatesComponent', () => {
  let component: ConfigTemplatesComponent;
  let fixture: ComponentFixture<ConfigTemplatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigTemplatesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigTemplatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
