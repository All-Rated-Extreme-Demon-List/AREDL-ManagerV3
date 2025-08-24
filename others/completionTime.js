export const completionTimeSplit = (time) => {
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time - hours * 3600000) / 60000);
    const seconds = Math.floor(
        (time - hours * 3600000 - minutes * 60000) / 1000,
    );
    const milliseconds = Math.floor(time % 1000);

    return {
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        milliseconds: milliseconds,
    };
};

export const completionTimeToMs = (time) => {
    return (
        time.hours * 3600000 +
        time.minutes * 60000 +
        time.seconds * 1000 +
        time.milliseconds
    );
};
export const getCompletionTime = (time) => {
    const {
        hours,
        minutes: minutes_raw,
        seconds: seconds_raw,
        milliseconds,
    } = completionTimeSplit(time);
    const minutes = String(minutes_raw).padStart(2, '0');
    const seconds = String(seconds_raw).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};
