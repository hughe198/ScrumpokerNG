import { Component, Input } from '@angular/core';
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

  faCheckSquare = faCheckSquare;
  faSquare = faSquare;

  get hasVoted(): boolean {
    return this.vote !== '';
  }
}
