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

  it('reactionsFor returns the voter\'s reactions, or a shared empty array', () => {
    const r = { id: 'r1', emoji: '👍', from_voter: 'id-1', to_voter: 'id-2', kind: 'normal' as const };
    component.reactions = { 'id-2': [r] };

    expect(component.reactionsFor('id-2')).toEqual([r]);
    expect(component.reactionsFor('id-1')).toEqual([]);
    // Same reference on every call, so change detection doesn't see a new input each pass
    expect(component.reactionsFor('id-1')).toBe(component.reactionsFor('id-3'));
  });

  it('passes reactions and missileUsed down to each card', () => {
    const r = { id: 'r1', emoji: '🔥', from_voter: 'id-1', to_voter: 'id-2', kind: 'normal' as const };
    component.votes = {
      'id-1': { voter: 'id-1', vote: '', displayName: 'Alice' },
      'id-2': { voter: 'id-2', vote: '', displayName: 'Bob' },
    };
    component.reactions = { 'id-2': [r] };
    component.missileUsed = true;
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('.reaction-chip');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toContain('🔥');
  });
});
