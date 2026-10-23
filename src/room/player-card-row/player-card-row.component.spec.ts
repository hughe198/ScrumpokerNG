import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerCardRowComponent } from './player-card-row.component';

describe('PlayerCardRowComponent', () => {
  let component: PlayerCardRowComponent;
  let fixture: ComponentFixture<PlayerCardRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCardRowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerCardRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isSelf matches only the current voter id', () => {
    component.myVoterID = 'abc';
    expect(component.isSelf('abc')).toBeTrue();
    expect(component.isSelf('def')).toBeFalse();
  });

  it('isSelf is false when myVoterID is not yet known', () => {
    component.myVoterID = null;
    expect(component.isSelf('abc')).toBeFalse();
  });

  it('voterIds reflects the votes map keys in insertion order', () => {
    component.votes = {
      'id-1': { voter: 'id-1', vote: '', displayName: 'Alice' },
      'id-2': { voter: 'id-2', vote: '5', displayName: 'Bob' },
    };
    expect(component.voterIds).toEqual(['id-1', 'id-2']);
  });

  it('only emits ownCardClicked for the current voter', () => {
    spyOn(component.ownCardClicked, 'emit');
    component.myVoterID = 'id-1';
    component.onCardClicked('id-2');
    expect(component.ownCardClicked.emit).not.toHaveBeenCalled();
    component.onCardClicked('id-1');
    expect(component.ownCardClicked.emit).toHaveBeenCalled();
  });
});
