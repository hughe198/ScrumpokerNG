import { Component, EventEmitter, Input, Output } from '@angular/core';
import { voteExponential, voteFibonacci, voteLinear, voteTshirts } from '../vote-types';
import { FormsModule } from '@angular/forms';
import { IUserDetails } from '../../i-user-details';
import { LocalStorageService } from '../../local-storage.service';
@Component({
  selector: 'app-voting-card',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './voting-card.component.html',
  styleUrl: './voting-card.component.css'
})
export class VotingCardComponent {

  @Output() votingCardChoice = new EventEmitter<string>
  @Output() vote = new EventEmitter<string>
  @Input() set onCardChoiceChange(choice: string) {
    if (choice) {
      this.selectedOption = choice
      console.log(choice)
      const newCard = this.votingCard.find((x) => x.name === choice)
      console.log(newCard?.selectedOptions())
      this.selectedOptions = newCard?.selectedOptions() ?? this.fibonacciCards.selectedOptions()
    }
    else {
      this.selectedOption = "fibonacci"
      this.selectedOptions = this.fibonacciCards.selectedOptions()
    }
  }

  selectedOption: string
  constructor(private localService: LocalStorageService) {
    this.selectedOption = "fibonacci"

  }
  exponetialCards = voteExponential
  fibonacciCards = voteFibonacci
  linearCards = voteLinear
  tshirtsCards = voteTshirts
  selectedOptions = this.fibonacciCards.selectedOptions()
  votingCard = [this.exponetialCards, this.fibonacciCards, this.linearCards, this.tshirtsCards]
  onCardChange(card: Event) {
    const selectElement = card.target as HTMLSelectElement
    const selectCard = selectElement.value
    console.log(selectCard)
    if (selectCard) {
      const newCard = this.votingCard.find((x) => x.name === selectCard)
      this.selectedOptions = newCard!.selectedOptions()
      this.votingCardChoice.emit(this.selectedOption)
    }
  }

  voteClicked(voteValue: string) {
    this.vote.emit(voteValue)
    console.log(`Voted:${voteValue}`)
  }
}


