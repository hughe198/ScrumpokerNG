import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { ApiService } from '../../api.service';
import { IReaction } from '../../i-reaction';
import { IVoteRecord } from '../../i-vote';
import { MISSILE_EMOJI, REACTION_EMOJIS } from './reaction-emojis';

type VotesMap = { [voterId: string]: IVoteRecord };

export interface IReactionGroup {
  emoji: string;
  count: number;
  names: string[];
  isMissile: boolean;
}

// Beyond this many distinct emojis on one card, the rest collapse into
// a "+N" chip so a busy card doesn't push the row layout around.
const MAX_CHIPS = 4;

// The backend model requires an id but always replaces it, so this only
// needs to be non-empty. crypto.randomUUID() is missing on plain-HTTP
// origins (e.g. the test VM), hence the fallback.
function clientReactionId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

@Component({
  selector: 'app-reaction-slot',
  standalone: true,
  imports: [],
  templateUrl: './reaction-slot.component.html',
  styleUrl: './reaction-slot.component.css'
})
export class ReactionSlotComponent {
  @Input() targetVoterId!: string;
  @Input() reactions: IReaction[] = [];
  @Input() missileUsed: boolean = false;
  // Used only to resolve sender display names for chip tooltips.
  @Input() votes: VotesMap = {};
  // Your own card shows reactions you've received, but no picker --
  // the backend doesn't stop self-reactions, the UI just doesn't offer them.
  @Input() readonly: boolean = false;

  pickerOpen = false;
  readonly emojis = REACTION_EMOJIS;
  readonly missileEmoji = MISSILE_EMOJI;

  constructor(private api: ApiService, private host: ElementRef<HTMLElement>) {}

  get targetName(): string {
    return this.votes[this.targetVoterId]?.displayName || 'this player';
  }

  get groups(): IReactionGroup[] {
    const byEmoji = new Map<string, IReactionGroup>();
    for (const reaction of this.reactions) {
      const group = byEmoji.get(reaction.emoji)
        ?? { emoji: reaction.emoji, count: 0, names: [], isMissile: false };
      group.count++;
      // A sender who has since left the room is no longer in votes.
      group.names.push(this.votes[reaction.from_voter]?.displayName || 'Someone');
      group.isMissile = group.isMissile || reaction.kind === 'missile';
      byEmoji.set(reaction.emoji, group);
    }
    return [...byEmoji.values()].sort((a, b) => b.count - a.count);
  }

  get visibleGroups(): IReactionGroup[] {
    return this.groups.slice(0, MAX_CHIPS);
  }

  get hiddenGroups(): IReactionGroup[] {
    return this.groups.slice(MAX_CHIPS);
  }

  chipTitle(group: IReactionGroup): string {
    return `${group.emoji} from ${group.names.join(', ')}`;
  }

  hiddenTitle(): string {
    return this.hiddenGroups.map(g => this.chipTitle(g)).join('\n');
  }

  togglePicker(): void {
    this.pickerOpen = !this.pickerOpen;
  }

  react(emoji: string): void {
    this.api.sendReaction({
      type: 'reaction',
      id: clientReactionId(),
      emoji,
      to_voter: this.targetVoterId,
    });
    this.pickerOpen = false;
  }

  fireMissile(): void {
    if (this.missileUsed) {
      return;
    }
    this.api.sendReaction({
      type: 'reaction',
      id: clientReactionId(),
      emoji: this.missileEmoji,
      to_voter: this.targetVoterId,
      kind: 'missile',
    });
    this.pickerOpen = false;
  }

  // Close on any click outside this slot. Not using stopPropagation
  // inside the slot, because that would also stop a click on a second
  // card's picker from closing this one.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.pickerOpen && !this.host.nativeElement.contains(event.target as Node)) {
      this.pickerOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.pickerOpen = false;
  }
}
