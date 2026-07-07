// Received once, right after connecting -- tells the client its own
// server-assigned voter id. Votes and reactions are keyed by this id,
// not by display name, so anything comparing "is this my own entry"
// needs to use this rather than the display name chosen at join time.
export interface IJoined {
    type: 'joined';
    voterID: string;
}
