const { getLogger } = require('log4js');
const errorLogger = getLogger('error');
const { baseURL } = require('./config.json');

class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

const api = {
    send: async function (path, method, query, body, token) {
        let cleanedQuery;
        if (query) {
            cleanedQuery = Object.entries(query)
                .filter(([_, v]) => v != null)
                .map(([k, v]) => [k, String(v)]);
        }
        const url =
            baseURL +
            path +
            (cleanedQuery ? '?' + new URLSearchParams(cleanedQuery) : '');

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        headers['User-Agent'] =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        const requestOptions = { method, headers };
        if (body) requestOptions.body = JSON.stringify(body);

        try {
            const response = await fetch(url, requestOptions);
            let responseData;

            const contentLength = response.headers.get('Content-Length');
            const contentType = response.headers.get('Content-Type');

            if (!(contentLength && parseInt(contentLength, 10) === 0)) {
                if (contentType && contentType.includes('application/json')) {
                    responseData = await response.json();
                } else {
                    responseData = { message: await response.text() };
                }
            } else {
                responseData = { message: 'Empty response.' };
            }

            return {
                status: response.status,
                data: responseData,
                error: !response.ok,
            };
        } catch (err) {
            errorLogger.error('Failed to fetch:', err);
            return {
                status: 500,
                data: { message: 'Failed to fetch data from the server.' },
                error: true,
            };
        }
    },
};

module.exports = { api, ApiError };
