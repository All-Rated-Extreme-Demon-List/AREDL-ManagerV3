import { BaseLevel } from "./level";
import { BaseUser } from "./user";

export interface DailyStatistics {
    date: Date;
    moderator?: BaseUser;
    submitted: number;
    accepted: number;
    denied: number;
    under_consideration: number;
}

export interface LevelStatistics {
    level: BaseLevel;
    records: number;
}

export interface SubmissionQueue {
    submissions_in_queue: number;
    uc_submissions: number;
    oldest_submission?: Date;
}
