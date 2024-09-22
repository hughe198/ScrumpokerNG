import { Component, EventEmitter, Output } from '@angular/core';
import { voteExponential, voteFibonacci, voteLinear, voteTshirts } from '../vote-types';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-voting-card',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './voting-card.component.html',
  styleUrl: './voting-card.component.css'
})
export class VotingCardComponent {

exponetialCards = voteExponential
fibonacciCards = voteFibonacci
linearCards = voteLinear
tshirtsCards = voteTshirts
selectedOptions = this.fibonacciCards.generateOptions()
votingCard = [this.exponetialCards,this.fibonacciCards,this.linearCards,this.tshirtsCards]
selectedOption =this.fibonacciCards.name
@Output() vote = new EventEmitter<string>
onCardChange(card:Event){
  const selectElement =card.target as HTMLSelectElement
  const selectCard = selectElement.value 
  console.log(selectCard)
  if (selectCard){
    const newCard = this.votingCard.find((x)=>x.name === selectCard)
    this.selectedOptions =newCard!.generateOptions()
  }

}

voteClicked(voteValue:string){
  this.vote.emit(voteValue)
  console.log(`Voted:${voteValue}`)
}
}


