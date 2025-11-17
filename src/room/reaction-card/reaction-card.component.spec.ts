import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactionCardComponent } from './reaction-card.component';

describe('ReactionCardComponent', () => {
  let component: ReactionCardComponent;
  let fixture: ComponentFixture<ReactionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactionCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReactionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
