import { BaseUser } from "./user";
import { ProfileRecord } from "./record";
import { NamedId } from "./api";

export interface BaseLevel extends NamedId {
    level_id: number;
    two_player: boolean;
    position: number;
    points: number;
    legacy: boolean;
}

export interface Level extends BaseLevel {
    publisher_id: string;
    tags: string[];
    description: string;
}

export interface ExtendedLevel extends Level {
    song: number;
    edel_enjoyment: number;
    is_edel_pending: boolean;
    gddl_tier: number;
    nlw_tier: number;
    publisher: BaseUser;
    verifications: ProfileRecord[];
}

export interface PackTier extends NamedId {
    color: string;
}

export interface Pack extends NamedId {
    tier: PackTier;
}
