import React, { useState, useEffect } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ConversationsSidebar } from './ConversationsSidebar';
import { ChatMain } from './ChatMain';

const useStyles = makeStyles({
    chatContainer: {
        display: 'flex',
        height: '100vh',
        width: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
        boxShadow: tokens.shadow16,
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

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleConversationSelect = (conversationId: string) => {
        setActiveConversationId(conversationId);
    };

    return (
        <div className={`${styles.chatContainer} ${isEmbedded ? styles.chatContainerEmbedded : ''}`}>
            <ConversationsSidebar
                isOpen={sidebarOpen}
                isMobile={isMobile}
                onToggle={toggleSidebar}
                activeConversationId={activeConversationId}
                onConversationSelect={handleConversationSelect}
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