import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactionSlotComponent } from './reaction-slot.component';
import { ApiService } from '../../api.service';
import { IReaction } from '../../i-reaction';

describe('ReactionSlotComponent', () => {
  let component: ReactionSlotComponent;
  let fixture: ComponentFixture<ReactionSlotComponent>;
  let api: ApiService;

  const votes = {
    'alice': { voter: 'alice', vote: '', displayName: 'Alice' },
    'bob': { voter: 'bob', vote: '', displayName: 'Bob' },
    'carol': { voter: 'carol', vote: '', displayName: 'Carol' },
  };

  function reaction(from: string, emoji: string, kind: 'normal' | 'missile' = 'normal'): IReaction {
    return { id: `${from}-${emoji}`, emoji, from_voter: from, to_voter: 'bob', kind };
  }

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactionSlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReactionSlotComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(ApiService);
    spyOn(api, 'sendReaction');
    component.targetVoterId = 'bob';
    component.votes = votes;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('groups reactions by emoji with counts and sender names, most popular first', () => {
    component.reactions = [
      reaction('alice', '👍'),
      reaction('alice', '😂'),
      reaction('carol', '😂'),
    ];

    expect(component.groups).toEqual([
      { emoji: '😂', count: 2, names: ['Alice', 'Carol'], isMissile: false },
      { emoji: '👍', count: 1, names: ['Alice'], isMissile: false },
    ]);
  });

  it('shows "Someone" for a sender who has left the room', () => {
    component.reactions = [reaction('ghost', '🔥')];
    expect(component.groups[0].names).toEqual(['Someone']);
  });

  it('marks missile groups', () => {
    component.reactions = [reaction('alice', '💥', 'missile')];
    expect(component.groups[0].isMissile).toBeTrue();
  });

  it('collapses groups beyond four into a "+N" chip', () => {
    component.reactions = ['👍', '👎', '😂', '🤔', '🎉', '😬'].map(e => reaction('alice', e));
    fixture.detectChanges();

    expect(component.visibleGroups.length).toBe(4);
    expect(component.hiddenGroups.length).toBe(2);
    expect(query('.reaction-chip.more')?.textContent).toContain('+2');
  });

  it('react() sends a normal reaction to the target and closes the picker', () => {
    component.pickerOpen = true;
    component.react('🎉');

    expect(api.sendReaction).toHaveBeenCalledWith(jasmine.objectContaining({
      type: 'reaction', emoji: '🎉', to_voter: 'bob',
    }));
    expect(component.pickerOpen).toBeFalse();
  });

  it('fireMissile() sends a missile-kind reaction', () => {
    component.fireMissile();

    expect(api.sendReaction).toHaveBeenCalledWith(jasmine.objectContaining({
      type: 'reaction', to_voter: 'bob', kind: 'missile',
    }));
  });

  it('fireMissile() does nothing once the missile is used', () => {
    component.missileUsed = true;
    component.fireMissile();
    expect(api.sendReaction).not.toHaveBeenCalled();
  });

  it('disables the missile button when used', () => {
    component.missileUsed = true;
    component.pickerOpen = true;
    fixture.detectChanges();

    const button = query('.missile-button') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
  });

  it('opens the picker from the trigger and offers 8 emojis plus the missile', () => {
    query('.reaction-trigger')!.click();
    fixture.detectChanges();

    expect(component.pickerOpen).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.picker-emoji').length).toBe(9);
  });

  it('closes the picker on a click outside the slot', () => {
    component.pickerOpen = true;
    document.body.click();
    expect(component.pickerOpen).toBeFalse();
  });

  it('readonly hides the trigger, and renders nothing with no reactions', () => {
    component.readonly = true;
    fixture.detectChanges();
    expect(query('.reaction-slot')).toBeNull();

    component.reactions = [reaction('alice', '👍')];
    fixture.detectChanges();
    expect(query('.reaction-chip')).not.toBeNull();
    expect(query('.reaction-trigger')).toBeNull();
  });
});
