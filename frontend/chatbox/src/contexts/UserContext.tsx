import React, { useState, useEffect, type ReactNode } from 'react';
import { apiService } from '../services/api';
import { UserIdManager } from '../utils/cookie';
import { UserContext, type UserContextType } from './userContext.types';

interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    // Load user ID từ localStorage ngay khi khởi tạo để đảm bảo sớm nhất
    const [userId, setUserIdState] = useState<string>(() => {
        return UserIdManager.getUserId() || '';
    });

    useEffect(() => {
        // Sync API service with current user ID from cookie
        apiService.setUserId(userId);
    }, [userId]);

    const setUserId = (newUserId: string) => {
        const trimmedUserId = newUserId.trim();
        setUserIdState(trimmedUserId);
        // API service will be updated via useEffect
    };

    return (
        <UserContext.Provider value={{ userId, setUserId } satisfies UserContextType}>
            {children}
        </UserContext.Provider>
    );
};

