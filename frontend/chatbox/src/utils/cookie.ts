
// Token management using localStorage (consistent with token-receiver.js)
const ACCESS_TOKEN_KEY = 'chat_access_token';
const USER_ID_KEY = 'chat_user_id';

export class AccessTokenManager {
    static getAccessToken(): string | null {
        try {
            return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
        } catch {
            return null;
        }
    }

    static setAccessToken(token: string): void {
        try {
            localStorage.setItem(ACCESS_TOKEN_KEY, token);
        } catch (error) {
            console.error('Cannot set access token:', error);
        }
    }

    static clearAccessToken(): void {
        try {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
        } catch (error) {
            console.error('Cannot clear access token:', error);
        }
    }

    static hasAccessToken(): boolean {
        return !!this.getAccessToken();
    }
}

export class UserIdManager {
    static getUserId(): string | null {
        try {
            return localStorage.getItem(USER_ID_KEY) || null;
        } catch {
            return null;
        }
    }

    static setUserId(userId: string): void {
        try {
            localStorage.setItem(USER_ID_KEY, userId);
        } catch (error) {
            console.error('Cannot set user ID:', error);
        }
    }

    static clearUserId(): void {
        try {
            localStorage.removeItem(USER_ID_KEY);
        } catch (error) {
            console.error('Cannot clear user ID:', error);
        }
    }
}

// Note: AccessTokenManager và UserIdManager được expose từ token-receiver.js
// và có thể truy cập qua window.AccessTokenManager, window.UserIdManager