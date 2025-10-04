import { createContext } from 'react';

export interface UserContextType {
    userId: string;
    setUserId: (userId: string) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);
