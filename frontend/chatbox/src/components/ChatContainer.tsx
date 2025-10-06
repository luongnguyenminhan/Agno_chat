import React, { useState, useEffect, useCallback } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ConversationsSidebar } from './ConversationsSidebar';
import { ChatMain } from './ChatMain';
import type { Conversation } from '../services/api';

const useStyles = makeStyles({
    chatContainer: {
        display: 'flex',
        height: '100vh',
        width: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
        position: 'relative',
    },
    chatContainerEmbedded: {
        borderRadius: tokens.borderRadiusMedium,
        overflow: 'hidden',
    },
});

interface ChatContainerProps {
    isEmbedded?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
    isEmbedded = false
}) => {
    const styles = useStyles();
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    // Handle responsive design
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            setSidebarOpen(!mobile);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-select most recent conversation
    const handleConversationsLoad = useCallback((conversations: Conversation[]) => {
        if (conversations.length > 0 && !activeConversationId) {
            const recent = conversations.sort((a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0];
            setActiveConversationId(recent.id);
        }
    }, [activeConversationId]);

    // Handle new conversation creation
    const handleNewConversation = useCallback((conversation: Conversation) => {
        setActiveConversationId(conversation.id);
    }, []);

    // Handle conversation selection
    const handleConversationSelect = useCallback((conversationId: string) => {
        setActiveConversationId(conversationId);
    }, []);

    // Toggle sidebar
    const toggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    return (
        <div className={`${styles.chatContainer} ${isEmbedded ? styles.chatContainerEmbedded : ''}`}>
            <ConversationsSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                onToggle={toggleSidebar}
                activeConversationId={activeConversationId}
                onConversationSelect={handleConversationSelect}
                onConversationsLoad={handleConversationsLoad}
                onNewConversation={handleNewConversation}
            />
            <ChatMain
                sidebarOpen={sidebarOpen}
                isMobile={isMobile}
                onToggleSidebar={toggleSidebar}
                activeConversationId={activeConversationId}
                onConversationChange={handleConversationSelect}
            />
        </div>
    );
};