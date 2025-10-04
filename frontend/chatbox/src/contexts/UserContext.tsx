import React, { useState, useEffect, type ReactNode } from 'react';
import { apiService } from '../services/api';
import { UserIdManager } from '../utils/cookie';
import { UserContext, type UserContextType } from './userContext.types';

interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [userId, setUserIdState] = useState(UserIdManager.getUserId());

    useEffect(() => {
        // Sync API service with current user ID from cookie
        apiService.setUserId(userId);
    }, [userId]);

    const setUserId = (newUserId: string) => {
        const trimmedUserId = newUserId.trim();
        if (trimmedUserId) {
            // Save to cookie and update state
            UserIdManager.setUserId(trimmedUserId);
            setUserIdState(trimmedUserId);
            // API service will be updated via useEffect
        }
    };

    return (
        <UserContext.Provider value={{ userId, setUserId } satisfies UserContextType}>
            {children}
        </UserContext.Provider>
    );
};

