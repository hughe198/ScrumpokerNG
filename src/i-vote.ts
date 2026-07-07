// Outgoing: cast/update a vote
export interface ISendVote {
    type: 'vote';
    voter: string;
    vote: string;
}

// A single voter's recorded vote, as received inside IResults.votes.
// displayName is resolved server-side from the live voter list, not
// something the client ever sends -- see ISendVote below, which
// deliberately has no displayName field.
export interface IVoteRecord {
    voter: string;
    vote: string;
    displayName: string;
}
