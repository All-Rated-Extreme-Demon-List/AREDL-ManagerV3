import { Logger, Container, TextDisplay, Separator } from "commandkit";
import { Client, MessageFlags, SeparatorSpacingSize } from "discord.js";
import {
    enableSeparateStaffServer,
    guildId,
    adminsAlertChannelID,
    adminsAlertRoleID,
    staffGuildId,
} from "@/config";
import { UserResolved } from "@/types/user";
import { SubmissionStatus } from "@/types/record";
import { getUserDisplayValue } from ".";

const RAPID_REVIEW_WINDOW_MS = 60_000;
const RAPID_REVIEW_THRESHOLD = 3;
const UNDER_REVIEW_THRESHOLD = 5;
const RECENT_ACTION_WINDOW = 20;
const MAX_TRACKED_ACTIONS = 50;

interface HiddenReviewerAction {
    createdAt: number;
    isPlat: boolean;
    levelName: string;
    levelPosition: number;
    state: SubmissionStatus;
    submissionId: string;
}

interface HiddenReviewerState {
    actions: HiddenReviewerAction[];
    rapidAlertActive: boolean;
    underReviewAlertActive: boolean;
}

interface HiddenReviewerActionInput {
    isPlat: boolean;
    levelName: string;
    levelPosition: number;
    state: SubmissionStatus;
    submissionId: string;
}

const hiddenReviewerStates = new Map<string, HiddenReviewerState>();

export const isHiddenReviewer = (user: UserResolved | null | undefined) =>
    user &&
    (user.scopes ?? []).includes("submission_review_base") &&
    !user.scopes?.includes("submission_review_full");

async function sendHiddenReviewerAlert(
    client: Client,
    details: string,
    actions: HiddenReviewerAction[]
): Promise<void> {
    const alertChannelId = adminsAlertChannelID || "";
    const guild = await client.guilds.fetch(
        enableSeparateStaffServer ? staffGuildId : guildId
    );
    const channel =
        guild.channels.cache.get(alertChannelId) ??
        (await guild.channels.fetch(alertChannelId).catch(() => null));

    if (!channel?.isSendable?.()) {
        Logger.warn(
            `Hidden reviewer alert channel ${alertChannelId} is not sendable.`
        );
        return;
    }

    const container = (
        <Container accentColor={0xff6f00}>
            <TextDisplay>{`<@&${adminsAlertRoleID}>`}</TextDisplay>
            <TextDisplay>## :warning: Reviewer Monitoring</TextDisplay>
            <TextDisplay>{details}</TextDisplay>
            <Separator spacing={SeparatorSpacingSize.Small} />
            {actions.map((entry) => {
                return (
                    <TextDisplay>{`[#${entry.levelPosition}] ${entry.levelName} | ${entry.state} | [Link](https://aredl.net/staff/submissions/${entry.submissionId}?list=${entry.isPlat ? "platformer" : "classic"}) | <t:${Math.floor(entry.createdAt / 1000)}:R>`}</TextDisplay>
                );
            })}
        </Container>
    );

    await channel.send({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
    });
}

export async function checkHiddenReviewerAction(
    client: Client,
    reviewer: UserResolved | null | undefined,
    actionInput: HiddenReviewerActionInput
): Promise<void> {
    if (!reviewer || !isHiddenReviewer(reviewer)) {
        return;
    }

    const reviewerState = hiddenReviewerStates.get(reviewer.id) ?? {
        actions: [],
        rapidAlertActive: false,
        underReviewAlertActive: false,
    };

    const action: HiddenReviewerAction = {
        ...actionInput,
        createdAt: Date.now(),
    };

    reviewerState.actions = [...reviewerState.actions, action].slice(
        -MAX_TRACKED_ACTIONS
    );

    const rapidWindowActions = reviewerState.actions.filter(
        (existingAction) =>
            action.createdAt - existingAction.createdAt <=
            RAPID_REVIEW_WINDOW_MS
    );

    const lastRecentActions =
        reviewerState.actions.slice(-RECENT_ACTION_WINDOW);

    const recentUnderReviewActions = lastRecentActions.filter(
        (existingAction) => existingAction.state === "UnderReview"
    );

    const rapidAlertTriggered =
        rapidWindowActions.length >= RAPID_REVIEW_THRESHOLD;

    const underReviewAlertTriggered =
        recentUnderReviewActions.length >= UNDER_REVIEW_THRESHOLD;

    if (rapidAlertTriggered && !reviewerState.rapidAlertActive) {
        await sendHiddenReviewerAlert(
            client,
            `${getUserDisplayValue(reviewer, true)} checked ${rapidWindowActions.length} submissions in less than a minute.`,
            rapidWindowActions
        );
    }

    if (underReviewAlertTriggered && !reviewerState.underReviewAlertActive) {
        await sendHiddenReviewerAlert(
            client,
            `${getUserDisplayValue(reviewer, true)} put ${recentUnderReviewActions.length} of their last ${lastRecentActions.length} submissions into UnderReview.`,
            recentUnderReviewActions
        );
    }

    reviewerState.rapidAlertActive = rapidAlertTriggered;
    reviewerState.underReviewAlertActive = underReviewAlertTriggered;
    hiddenReviewerStates.set(reviewer.id, reviewerState);
}
