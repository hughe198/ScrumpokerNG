// Received by everyone in the room when a missile is fired. Arrives just
// before the settings broadcast that adds the 💥 reaction chip, so
// reactionID lets the UI hold that chip back until the missile "lands".
export interface IMissileLaunch {
    type: 'missile';
    reactionID: string;
    fromVoter: string;
    toVoter: string;
    fromName: string;
    toName: string;
}
