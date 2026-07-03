import { IVoteRecord } from './i-vote';

export interface IResults {
    type: 'result';
    roomID: string;
    votes: { [voterId: string]: IVoteRecord };
}
