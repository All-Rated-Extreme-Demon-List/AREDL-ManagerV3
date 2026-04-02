import { UserResolved } from "@/types/user";

export const getUserDisplayValue = (
    user: UserResolved | null | undefined
): string =>
    !user
        ? "Unknown"
        : user.discord_id
          ? `<@${user.discord_id}>`
          : user.global_name;
