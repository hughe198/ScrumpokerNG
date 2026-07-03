import { IReaction } from './i-reaction';

// Outgoing: client pushing a settings change (distinct from the
// Reveal_votes/cardChange commands, which cover the common single-field
// cases individually)
export interface ISendSettingsUpdate {
    type: 'settings';
    reveal: boolean;
    votingCard: string;
}

// Received: full settings broadcast from the server
export interface ISettings {
    type: 'settings';
    reveal: boolean;
    votingCard: string;
    reactions: { [voterId: string]: IReaction[] };
    missile_used_by: string[];
}
