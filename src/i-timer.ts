export type TimerAction = 'start' | 'add' | 'pause' | 'resume' | 'stop';

// Outgoing: control the room's discussion timer. seconds is required for
// 'start' and optional for 'add' (the server defaults it to 60).
export interface ISendTimer {
    type: 'timer';
    action: TimerAction;
    seconds?: number;
}

// Received inside ISettings.timer. Times are epoch ms on the SERVER's
// clock -- compare against ISettings.serverTime, not Date.now() directly.
export interface ITimerState {
    state: 'running' | 'paused';
    endsAt: number | null;       // set while running
    remainingMs: number | null;  // set while paused
    duration: number;            // seconds, as originally started
    startedBy: string;
}
