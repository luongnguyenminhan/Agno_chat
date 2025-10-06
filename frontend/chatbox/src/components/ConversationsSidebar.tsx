import {
    Button,
    makeStyles,
    Text,
    tokens,
} from '@fluentui/react-components';
import { Add24Regular, ClipboardTaskListLtr24Regular, PanelLeft24Regular } from '@fluentui/react-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiService, type Conversation } from '../services/api';
import { AccessTokenManager } from '../utils/cookie';
import { MeetingModal } from './MeetingModal';

const useStyles = makeStyles({
    sidebar: {
        width: '320px',
        minWidth: '280px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: `all ${tokens.durationNormal}`,
        position: 'relative',
    },
    sidebarCollapsed: {
        width: '0px',
        minWidth: '0px',
        opacity: 0,
        transform: 'translateX(-100%)',
        pointerEvents: 'none',
    },
    sidebarMobile: {
        position: 'fixed',
        top: '0',
        left: '0',
        height: '100%',
        zIndex: 1000,
        boxShadow: tokens.shadow64,
        transform: 'translateX(-100%)',
    },
    sidebarMobileOpen: {
        transform: 'translateX(0%)',
    },
    sidebarHeader: {
        padding: tokens.spacingVerticalL,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground2,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalS,
    },
    sidebarTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalM,
    },
    newChatBtn: {
        width: '100%',
        marginTop: tokens.spacingVerticalXS,
    },
    indexMeetingBtn: {
        width: '100%',
        marginTop: tokens.spacingVerticalXS,
    },
    conversationsList: {
        flex: 1,
        overflowY: 'auto',
        padding: `${tokens.spacingVerticalXS} 0`,
    },
    conversationItem: {
        padding: `${tokens.spacingVerticalM} ${tokens.spacingVerticalL}`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
        cursor: 'pointer',
        transition: `background-color ${tokens.durationNormal}`,
        ':hover': {
            backgroundColor: tokens.colorNeutralBackground3,
        },
    },
    conversationItemActive: {
        backgroundColor: tokens.colorBrandBackground2,
        borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    },
    conversationTitle: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalXXS,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    conversationMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
    },
    messageCount: {
        backgroundColor: tokens.colorNeutralBackground4,
        padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
        borderRadius: tokens.borderRadiusCircular,
        fontSize: tokens.fontSizeBase100,
    },
});

// Using Conversation interface from api.ts

interface UserInfo {
    id: string;
    email: string;
    role: string;
    name: string;
    username: string;
    confirmed: boolean;
    create_date: string;
    update_date: string;
    profile_picture?: string;
    first_name: string;
    last_login_at?: string;
    is_first_login: boolean;
    last_name: string;
    locale: string;
    oauth_id?: string;
    oauth_provider?: string;
    sso_provider?: string;
    sso_id?: string;
    fish_balance: number;
    access_token: string;
    refresh_token: string;
    token_type: string;
}

interface ConversationsSidebarProps {
    isOpen: boolean;
    isMobile: boolean;
    onToggle: () => void;
    activeConversationId?: string | null;
    onConversationSelect?: (conversationId: string) => void;
    onConversationsLoad?: (conversations: Conversation[]) => void;
    onNewConversation?: (conversation: Conversation) => void;
}

export const ConversationsSidebar: React.FC<ConversationsSidebarProps> = ({
    isOpen,
    isMobile,
    onToggle,
    activeConversationId,
    onConversationSelect,
    onConversationsLoad,
    onNewConversation
}) => {
    const styles = useStyles();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const currentUserId = userInfo?.id;

    useEffect(() => {
        if (AccessTokenManager.hasAccessToken()) {
            loadUserInfo();
        }
    }, []);

    // Handle click outside to close sidebar on mobile
    useEffect(() => {
        if (!isMobile || !isOpen || !sidebarRef.current) return;

        const handleClickOutside = (event: MouseEvent) => {
            // Close sidebar if clicking outside of it (including overlay)
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                onToggle();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMobile, isOpen, onToggle]);

    const loadUserInfo = async () => {
        if (!AccessTokenManager.hasAccessToken()) {
            return;
        }

        try {
            const userData = await apiService.getUserInfo();
            if (userData && userData.data) {
                setUserInfo(userData.data);
            }
        } catch (error) {
            console.error('Failed to load user info:', error);
        }
    };

    const loadConversations = useCallback(async () => {
        if (isInitialized) return;

        setIsLoading(true);
        try {
            const conversationsData = await apiService.getConversations();
            setConversations(conversationsData);
            setIsInitialized(true);

            if (onConversationsLoad) {
                onConversationsLoad(conversationsData);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            setIsInitialized(true);
        } finally {
            setIsLoading(false);
        }
    }, [onConversationsLoad, isInitialized]);

    const createNewConversation = useCallback(async () => {
        if (isInitialized && conversations.length > 0) return;

        setIsLoading(true);
        try {
            const newConversation = await apiService.createConversation('New Conversation');
            setConversations(prev => [newConversation, ...prev]);
            setIsInitialized(true);

            if (onNewConversation) {
                onNewConversation(newConversation);
            }
            if (onConversationSelect) {
                onConversationSelect(newConversation.id);
            }
        } catch (error) {
            console.error('Error creating conversation:', error);
        } finally {
            setIsLoading(false);
        }
    }, [onNewConversation, onConversationSelect, isInitialized, conversations.length]);

    const selectConversation = useCallback((conversationId: string) => {
        if (onConversationSelect) {
            onConversationSelect(conversationId);
        }
    }, [onConversationSelect]);

    const openMeetingIndexModal = useCallback(() => {
        setIsMeetingModalOpen(true);
    }, []);

    const closeMeetingModal = useCallback(() => {
        setIsMeetingModalOpen(false);
    }, []);

    // Initialize conversations only once when user is available and not initialized yet
    useEffect(() => {
        if (currentUserId && !isInitialized) {
            loadConversations();
        }
    }, [currentUserId, isInitialized, loadConversations]);

    // Handle conversations loaded - check if need to create new one (only once)
    useEffect(() => {
        if (isInitialized && !isLoading && conversations.length === 0 && currentUserId) {
            createNewConversation();
        }
    }, [isInitialized, isLoading, conversations.length, currentUserId, createNewConversation]);

    const sidebarClasses = [
        styles.sidebar,
        !isOpen && styles.sidebarCollapsed,
        isMobile && styles.sidebarMobile,
        isMobile && isOpen && styles.sidebarMobileOpen,
    ].filter(Boolean).join(' ');

    return (
        <div className={sidebarClasses} ref={sidebarRef}>
            {isMobile && isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: '320px',
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 999,
                    }}
                    onClick={onToggle}
                />
            )}
            <div className={styles.sidebarHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                    <Text className={styles.sidebarTitle}>Cuộc trò chuyện</Text>
                    {isMobile && (
                        <Button
                            icon={<PanelLeft24Regular />}
                            onClick={onToggle}
                            size="small"
                            appearance="subtle"
                        />
                    )}
                </div>
                {userInfo && (
                    <div style={{
                        padding: `${tokens.spacingVerticalM} ${tokens.spacingVerticalL}`,
                        borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
                        backgroundColor: tokens.colorNeutralBackground1
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: tokens.colorBrandBackground,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: tokens.fontSizeBase400,
                                fontWeight: tokens.fontWeightSemibold,
                                color: tokens.colorNeutralForegroundInverted
                            }}>
                                {userInfo.first_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <Text style={{ fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold }}>
                                    {userInfo.name}
                                </Text>
                                <div>
                                    <Text style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 }}>
                                        {userInfo.email}
                                    </Text>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Button
                    className={styles.newChatBtn}
                    icon={<Add24Regular />}
                    onClick={createNewConversation}
                >
                    Trò chuyện mới
                </Button>

                <Button
                    className={styles.indexMeetingBtn}
                    icon={<ClipboardTaskListLtr24Regular />}
                    onClick={openMeetingIndexModal}
                >
                    Lập chỉ mục cuộc họp
                </Button>
            </div>

            <div className={styles.conversationsList}>
                {!currentUserId ? (
                    <div style={{ padding: tokens.spacingVerticalL, textAlign: 'center' }}>
                        <Text>Vui lòng đăng nhập để tiếp tục</Text>
                    </div>
                ) : isLoading ? (
                    <div style={{ padding: tokens.spacingVerticalL, textAlign: 'center' }}>
                        <Text>Đang tải cuộc trò chuyện...</Text>
                    </div>
                ) : conversations.length === 0 ? (
                    <div style={{ padding: tokens.spacingVerticalL, textAlign: 'center' }}>
                        <Text>Chưa có cuộc trò chuyện nào</Text>
                    </div>
                ) : (
                    conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            className={`${styles.conversationItem} ${activeConversationId === conversation.id ? styles.conversationItemActive : ''
                                }`}
                            onClick={() => selectConversation(conversation.id)}
                        >
                            <Text className={styles.conversationTitle}>
                                {conversation.title || 'Cuộc trò chuyện chưa có tiêu đề'}
                            </Text>
                            <div className={styles.conversationMeta}>
                                <Text>{apiService.formatDate(conversation.updated_at)}</Text>
                                {conversation.message_count && conversation.message_count > 0 && (
                                    <span className={styles.messageCount}>{conversation.message_count}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <MeetingModal isOpen={isMeetingModalOpen} onClose={closeMeetingModal} userId={currentUserId} />
        </div>
    );
};