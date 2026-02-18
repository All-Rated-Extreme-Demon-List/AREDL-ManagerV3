import { LevelRecord } from "./record";
import { BaseLevel, Pack } from "./level";

export interface BaseUser {
    id: string;
    username: string;
    global_name: string;
}

export interface User extends BaseUser {
    country?: number;
    discord_id?: string;
    discord_avatar?: string;
}

export interface Clan {
    id: string;
    global_name: string;
    tag: string;
    description?: string;
}

export interface Role {
    id: string;
    privilege_level: number;
    role_desc: string;
    hide: boolean;
}

export interface Profile extends User {
    placeholder: boolean;
    description?: string;
    ban_level: number;
    background_level: number;
    clan?: Clan;
    roles: Role[];
    rank: {
        rank: number;
        raw_rank: number;
        extremes_rank: number;
        country_rank: number;
        country_raw_rank: number;
        country_extremes_rank: number;
        total_points: number;
        pack_points: number;
        extremes: number;
    };
    packs: Pack[];
    records: LevelRecord[];
    created: BaseLevel[];
    published: BaseLevel[];
}
