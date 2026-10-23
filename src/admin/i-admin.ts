// Shapes returned by the API's /api/admin endpoints. Times are epoch ms.

export interface IAdminLogin {
    token: string;
    expiresAt: number;
}

export interface IAdminRoomSummary {
    roomID: string;
    voterCount: number;
    votedCount: number;
    revealed: boolean;
    votingCard: string;
    timerState: 'running' | 'paused' | null;
    createdAt: number;
    lastActivity: number;
    expiresAt: number;
}

export interface IAdminStats {
    activeRooms: number;
    inactiveRooms: number;
    connectedUsers: number;
    uptimeSeconds: number;
}

// "Active" rooms have at least one person connected; "inactive" rooms are
// empty but kept until they expire.
export interface IAdminRoomList {
    stats: IAdminStats;
    active: IAdminRoomSummary[];
    inactive: IAdminRoomSummary[];
}

export interface IAdminRoomDetail extends IAdminRoomSummary {
    voters: { name: string; hasVoted: boolean }[];
    reactionCount: number;
    missileFiredBy: string[];
    timer: {
        state: 'running' | 'paused';
        endsAt: number | null;
        remainingMs: number | null;
        duration: number;
        startedBy: string;
    } | null;
}
