export type CommandName = 'Clear_votes' | 'Reveal_votes' | 'Exit_room';

export interface ICommand {
    type: 'command';
    command: CommandName;
}
