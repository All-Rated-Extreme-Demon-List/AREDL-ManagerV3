interface ApiSuccessResponse<T> {
    error: false;
    status: number;
    data: T;
}

interface ApiErrorResponse {
    error: true;
    status: number;
    data: { message: string };
}

export type ApiResponse<T> = ApiErrorResponse | ApiSuccessResponse<T>;

export interface PaginatedResponse<T> {
    data: T[];
    pages: number;
    page: number;
    per_page: number;
}

export interface NamedId {
    id: string;
    name: string;
}
