import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheckSquare, faSquare } from '@fortawesome/free-solid-svg-icons';
import { ReactionSlotComponent } from '../reaction-slot/reaction-slot.component';
import { IReaction } from '../../i-reaction';
import { IVoteRecord } from '../../i-vote';

type VotesMap = { [voterId: string]: IVoteRecord };

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [FontAwesomeModule, ReactionSlotComponent],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.css'
})
export class PlayerCardComponent {
  @Input() voterId!: string;
  @Input() displayName: string = '';
  @Input() vote: string = '';
  @Input() reveal: boolean = false;
  @Input() isSelf: boolean = false;
  @Input() reactions: IReaction[] = [];
  @Input() missileUsed: boolean = false;
  @Input() votes: VotesMap = {};

  // Fires only when this is your own card and votes are still hidden --
  // the parent decides what to do with it (opening the vote modal is
  // step 5 of the build order, not wired here yet).
  @Output() cardClicked = new EventEmitter<void>();

  faCheckSquare = faCheckSquare;
  faSquare = faSquare;

  get hasVoted(): boolean {
    return this.vote !== '';
  }

  get isClickable(): boolean {
    return this.isSelf && !this.reveal;
  }

  onClick(): void {
    if (this.isClickable) {
      this.cardClicked.emit();
    }
  }
}
