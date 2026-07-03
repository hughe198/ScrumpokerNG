// Outgoing: cast/update a vote
export interface ISendVote {
    type: 'vote';
    voter: string;
    vote: string;
}

// A single voter's recorded vote, as received inside IResults.votes
export interface IVoteRecord {
    voter: string;
    vote: string;
}
