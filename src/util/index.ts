import { UserResolved } from "@/types/user";

export const getUserDisplayValue = (
    user: UserResolved | null | undefined,
    alwaysShowGlobalName = false
): string =>
    !user
        ? "Unknown"
        : user.discord_id
          ? alwaysShowGlobalName ? `${user.global_name} (<@${user.discord_id}>)` : `<@${user.discord_id}>`
          : user.global_name;
