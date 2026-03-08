import { User } from "./user";

type ShiftStatus = "Running" | "Completed" | "Expired";

export interface Shift {
    id: string;
    user: User;
    target_count: number;
    completed_count: number;
    start_at: Date;
    end_at: Date;
    status: ShiftStatus;
}

export interface WebsocketShift {
    user_id: string;
    target_count: number;
    start_at: string;
    end_at: string;
}

export interface WebsocketFinishedShift extends WebsocketShift {
    id: string;
    completed_count: number;
    status: ShiftStatus;
    target_count: number;
}
