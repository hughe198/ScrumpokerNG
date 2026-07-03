import { ISendVote } from './i-vote';
import { ICommand } from './i-command';
import { ICardChange } from './i-card-change';
import { ISendReaction } from './i-reaction';
import { ISendSettingsUpdate, ISettings } from './i-settings';
import { IResults } from './i-results';
import { IError } from './i-error';
import { ISuccess } from './i-success';

// Everything the client ever sends into the dispatch loop (post-handshake).
// IJoinRoom is deliberately excluded -- it's the one-off first message,
// read before this union's routing even applies.
export type ClientMessage =
    | ISendVote
    | ICommand
    | ICardChange
    | ISendReaction
    | ISendSettingsUpdate;

// Everything the server ever sends back.
export type ServerMessage =
    | IResults
    | ISettings
    | IError
    | ISuccess;
