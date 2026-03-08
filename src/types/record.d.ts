import { PaginatedResponse } from "./api";
import { BaseLevel, Level } from "./level";
import { BaseUser, Clan, User } from "./user";

type SubmissionStatus =
    | "Pending"
    | "Claimed"
    | "UnderConsideration"
    | "Denied"
    | "Accepted"
    | "UnderReview";

export interface RecordBase {
    id: string;
    mobile: boolean;
    video_url: string;
    hide_video: boolean;
}

export interface ProfileRecordBase<U> extends RecordBase {
    submitted_by: U;
}

export type ProfileRecord = ProfileRecordBase<BaseUser>;
export type ProfileRecordExtended = ProfileRecordBase<User>;

export interface LevelRecordBase<L> extends RecordBase {
    is_verification: boolean;
    level: L;
}

export type LevelRecord = LevelRecordBase<BaseLevel>;
export type LevelRecordExtended = LevelRecordBase<Level>;
export interface LeaderboardEntryData {
    rank: number;
    extremes_rank: number;
    raw_rank: number;
    country_rank: number;
    country_extremes_rank: number;
    country_raw_rank: number;
    user: User;
    country?: number;
    total_points: number;
    pack_points: number;
    hardest?: BaseLevel;
    extremes: number;
    clan?: Clan;
}

export interface LeaderboardEntry extends PaginatedResponse<LeaderboardEntryData> {
    last_refreshed: string;
}

export interface Submission {
    id: string;
    level: Level;
    submitted_by: User;
    mobile: boolean;
    ldm_id?: number;
    completion_time: number | undefined;
    video_url: string;
    raw_url?: string;
    mod_menu?: string;
    status: SubmissionStatus;
    reviewer?: U;
    private_reviewer_notes?: string;
    priority: boolean;
    reviewer_notes?: string;
    user_notes?: string;
    locked: boolean;
    priority_value: number;
    created_at: Date;
    updated_at: Date;
}

export interface UnresolvedSubmission {
    id: string;
    level_id: string;
    submitted_by: string;
    mobile: boolean;
    completion_time: number | undefined;
    ldm_id?: number;
    video_url: string;
    raw_url?: string;
    mod_menu?: string;
    status: SubmissionStatus;
    reviewer_id?: string;
    private_reviewer_notes?: string;
    priority: boolean;
    reviewer_notes?: string;
    user_notes?: string;
    locked: boolean;
    priority_value: number;
    created_at: Date;
    updated_at: Date;
}
