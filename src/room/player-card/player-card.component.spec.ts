import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerCardComponent } from './player-card.component';

describe('PlayerCardComponent', () => {
  let component: PlayerCardComponent;
  let fixture: ComponentFixture<PlayerCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerCardComponent);
    component = fixture.componentInstance;
    component.voterId = 'test-voter-id';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be clickable only when isSelf and not revealed', () => {
    component.isSelf = true;
    component.reveal = false;
    expect(component.isClickable).toBeTrue();

    component.reveal = true;
    expect(component.isClickable).toBeFalse();

    component.isSelf = false;
    component.reveal = false;
    expect(component.isClickable).toBeFalse();
  });

  it('should not emit cardClicked when not clickable', () => {
    spyOn(component.cardClicked, 'emit');
    component.isSelf = false;
    component.onClick();
    expect(component.cardClicked.emit).not.toHaveBeenCalled();
  });

  it('should emit cardClicked when clickable', () => {
    spyOn(component.cardClicked, 'emit');
    component.isSelf = true;
    component.reveal = false;
    component.onClick();
    expect(component.cardClicked.emit).toHaveBeenCalled();
  });

  it('hasVoted reflects whether vote is non-empty', () => {
    component.vote = '';
    expect(component.hasVoted).toBeFalse();
    component.vote = '5';
    expect(component.hasVoted).toBeTrue();
  });
});
