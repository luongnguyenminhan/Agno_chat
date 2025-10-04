import Cookies from 'js-cookie';

const USER_ID_COOKIE_KEY = 'chat_user_id';
const COOKIE_EXPIRES_DAYS = 30;

export class UserIdManager {
    static getUserId(): string {
        // Try to get from cookie first, fallback to default
        const cookieUserId = Cookies.get(USER_ID_COOKIE_KEY);
        return cookieUserId || '4c3b4f0f-8d99-42cd-9676-8a16a974c507';
    }

    static setUserId(userId: string): void {
        if (userId && userId.trim()) {
            Cookies.set(USER_ID_COOKIE_KEY, userId.trim(), {
                expires: COOKIE_EXPIRES_DAYS,
                sameSite: 'strict'
            });
        }
    }

    static clearUserId(): void {
        Cookies.remove(USER_ID_COOKIE_KEY);
    }

    static generateNewUserId(): string {
        // Generate a random UUID v4
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        // Fallback UUID v4 generator for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static hasUserId(): boolean {
        return !!Cookies.get(USER_ID_COOKIE_KEY);
    }
}
