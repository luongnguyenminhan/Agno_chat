// Inline AccessTokenManager và UserIdManager
const ACCESS_TOKEN_KEY = 'chat_access_token';
const USER_ID_KEY = 'chat_user_id';

class AccessTokenManager {
    static getAccessToken() {
        try {
            return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
        } catch {
            return null;
        }
    }

    static setAccessToken(token) {
        try {
            localStorage.setItem(ACCESS_TOKEN_KEY, token);
        } catch (error) {
            console.error('Cannot set access token:', error);
        }
    }

    static clearAccessToken() {
        try {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
        } catch (error) {
            console.error('Cannot clear access token:', error);
        }
    }

    static hasAccessToken() {
        return !!this.getAccessToken();
    }
}

class UserIdManager {
    static getUserId() {
        try {
            return localStorage.getItem(USER_ID_KEY) || null;
        } catch {
            return null;
        }
    }

    static setUserId(userId) {
        try {
            localStorage.setItem(USER_ID_KEY, userId);
        } catch (error) {
            console.error('Cannot set user ID:', error);
        }
    }

    static clearUserId() {
        try {
            localStorage.removeItem(USER_ID_KEY);
        } catch (error) {
            console.error('Cannot clear user ID:', error);
        }
    }
}

// Lắng nghe token từ parent qua postMessage
window.addEventListener("message", (event) => {
    // Chấp nhận luôn mọi origin nếu anh không cần bảo mật
    const data = event.data;
    if (!data || data.type !== "SET_TOKEN") return;

    console.log("✅ Nhận token từ parent:", data);

    try {
        AccessTokenManager.setAccessToken(data.token);
        UserIdManager.setUserId(data.userId);
        console.log("💾 Token & user ID đã lưu vào localStorage.");
    } catch (err) {
        console.error("❌ Lỗi khi lưu token:", err);
    }
});

// Nếu token chưa có => yêu cầu lại từ parent
if (!AccessTokenManager.hasAccessToken()) {
    console.log("🔁 Chưa có token, yêu cầu parent gửi lại...");
    window.parent.postMessage({ type: "REQUEST_TOKEN" }, "*");
}

// Expose classes to global scope để React app có thể truy cập
window.AccessTokenManager = AccessTokenManager;
window.UserIdManager = UserIdManager;

console.log("🔗 Token managers đã được expose ra global scope");
