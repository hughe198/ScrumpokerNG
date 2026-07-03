export type CommandName = 'Clear_votes' | 'Delete_room' | 'Reveal_votes' | 'Exit_room';

export interface ICommand {
    type: 'command';
    command: CommandName;
}
