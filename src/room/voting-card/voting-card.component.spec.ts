import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { VotingCardComponent } from './voting-card.component';

describe('VotingCardComponent', () => {
  let component: VotingCardComponent;
  let fixture: ComponentFixture<VotingCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VotingCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VotingCardComponent);
    component = fixture.componentInstance;
    component.clearVotes = new Subject<void>();  // required input, normally passed by RoomComponent
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
