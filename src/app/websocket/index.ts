// WebSocket handlers - manually imported to work correctly in bundled environments
import shiftCompleted from "./shift_completed";
import shiftMissed from "./shift_missed";
import shiftsCreated from "./shifts_created";
import submissionAccept from "./submission_accept";
import submissionDenied from "./submission_denied";
import submissionUnderReview from "./submission_under_review";
import submissionUc from "./submission_uc";

export const handlers = [
    shiftCompleted,
    shiftMissed,
    shiftsCreated,
    submissionAccept,
    submissionDenied,
    submissionUnderReview,
    submissionUc,
];
