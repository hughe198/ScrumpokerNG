export type ReactionKind = 'normal' | 'missile';

// Outgoing: fire a reaction.
// from_voter is intentionally absent -- the server stamps it from the
// connection identity and ignores/overwrites anything sent here, so
// there's no point including (or trusting) it client-side.
export interface ISendReaction {
    type: 'reaction';
    id: string;
    emoji: string;
    to_voter: string;
    kind?: ReactionKind; // defaults to 'normal' server-side if omitted
}

// A reaction as stored/broadcast inside ISettings.reactions
export interface IReaction {
    id: string;
    emoji: string;
    from_voter: string;
    to_voter: string;
    kind: ReactionKind;
}
