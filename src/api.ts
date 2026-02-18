import { Logger } from "commandkit";
import { baseURL } from "../config.json";
import { ApiResponse } from "./types/api";

class ApiError extends Error {
    status: number;
    data: object;
    constructor(message: string, status: number, data: object) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

const api = {
    send: async function <T = unknown>(
        path: string,
        method: string = "GET",
        query?: object,
        body?: object
    ): Promise<ApiResponse<T>> {
        let cleanedQuery;
        if (query) {
            cleanedQuery = Object.entries(query)
                .filter(([k, v]) => k !== null && v != null)
                .map(([k, v]) => [k, String(v)]);
        }
        const url =
            baseURL +
            path +
            (cleanedQuery ? "?" + new URLSearchParams(cleanedQuery) : "");

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.API_TOKEN}`,
        };

        headers["User-Agent"] =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

        const requestOptions = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        };

        try {
            const response = await fetch(url, requestOptions);
            let responseData;

            const contentLength = response.headers.get("Content-Length");
            const contentType = response.headers.get("Content-Type");

            if (!(contentLength && parseInt(contentLength, 10) === 0)) {
                if (contentType && contentType.includes("application/json")) {
                    responseData = await response.json();
                } else {
                    responseData = { message: await response.text() };
                }
            } else {
                responseData = { message: "Empty response." };
            }

            return {
                status: response.status,
                data: responseData,
                error: !response.ok,
            };
        } catch (err) {
            Logger.error("Failed to fetch:");
            Logger.error(err);
            return {
                status: 500,
                data: {
                    message: "Failed to fetch data from the server.",
                },
                error: true,
            };
        }
    },
};

export { api, ApiError };
