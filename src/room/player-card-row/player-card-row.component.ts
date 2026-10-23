import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { IVoteRecord } from '../../i-vote';

type VotesMap = { [voterId: string]: IVoteRecord };

@Component({
  selector: 'app-player-card-row',
  standalone: true,
  imports: [PlayerCardComponent],
  templateUrl: './player-card-row.component.html',
  styleUrl: './player-card-row.component.css'
})
export class PlayerCardRowComponent {
  @Input() votes: VotesMap = {};
  @Input() reveal: boolean = false;
  @Input() myVoterID: string | null = null;

  // Fired when the current user clicks their own card while hidden.
  // The parent (room.component) is responsible for opening the vote
  // modal -- this component doesn't know the modal exists.
  @Output() ownCardClicked = new EventEmitter<void>();

  // Stable order: insertion order from the votes map, NOT re-sorted by
  // vote value on reveal. Re-sorting on reveal would reshuffle cards at
  // the exact moment people are looking for their own, which is worse
  // UX than a fixed layout. If value-sorted order is wanted later, swap
  // this getter's implementation -- nothing else needs to change.
  get voterIds(): string[] {
    return Object.keys(this.votes);
  }

  isSelf(voterId: string): boolean {
    return this.myVoterID !== null && voterId === this.myVoterID;
  }

  onCardClicked(voterId: string): void {
    if (this.isSelf(voterId)) {
      this.ownCardClicked.emit();
    }
  }
}
