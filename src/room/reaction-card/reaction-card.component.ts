import { Component, EventEmitter, Output } from '@angular/core';
@Component({
  selector: 'reaction-card',
  standalone: true,
  imports: [],
  templateUrl: './reaction-card.component.html',
  styleUrl: './reaction-card.component.css'
})
export class ReactionCardComponent {

@Output() reactionSelected = new EventEmitter<string>() 
emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '💩'];
showPicker = false;
selectedEmoji = ""

togglePicker(){
  this.showPicker = !this.showPicker
}

selectReaction(emoji:string){
  this.selectedEmoji = emoji
  this.reactionSelected.emit(emoji)
  this.showPicker = false
}

}
