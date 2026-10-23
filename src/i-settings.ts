import { IReaction } from './i-reaction';
import { ITimerState } from './i-timer';

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
    timer: ITimerState | null;
    // Server clock (epoch ms) when this message was sent, so clients can
    // correct for their own clock being off when counting down.
    serverTime: number;
}

// Used before the first server settings message arrives and after
// disconnect. votingCard must match a card `name` in vote-types.ts
// ("Standard" is also the backend's default).
export const DEFAULT_SETTINGS: ISettings = {
    type: 'settings',
    reveal: false,
    votingCard: 'Standard',
    reactions: {},
    missile_used_by: [],
    timer: null,
    serverTime: 0,
};
