import React, { useState, useEffect } from 'react';
import {
    makeStyles,
    tokens,
    Button,
    Input,
    Text,
} from '@fluentui/react-components';
import { Add24Regular, CubeMultiple24Regular, ClipboardTaskListLtr24Regular, PanelLeft24Regular } from '@fluentui/react-icons';
import { MeetingModal } from './MeetingModal';
import { apiService, type Conversation } from '../services/api';
import { useUser } from '../hooks/useUser';
import type { UserContextType } from '../contexts/userContext.types';
import { UserIdManager } from '../utils/cookie';

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
    userIdContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalXXS,
    },
    userIdLabel: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground2,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    userIdInputWrapper: {
        display: 'flex',
        gap: tokens.spacingHorizontalXS,
        alignItems: 'center',
    },
    userIdInput: {
        flex: 1,
    },
    generateUuidBtn: {
        minWidth: '40px',
        padding: tokens.spacingHorizontalXS,
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

interface ConversationsSidebarProps {
    isOpen: boolean;
    isMobile: boolean;
    onToggle: () => void;
    activeConversationId?: string | null;
    onConversationSelect?: (conversationId: string) => void;
}

export const ConversationsSidebar: React.FC<ConversationsSidebarProps> = ({
    isOpen,
    isMobile,
    onToggle,
    activeConversationId,
    onConversationSelect
}) => {
    const styles = useStyles();
    const { userId, setUserId }: UserContextType = useUser();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadConversations();
    }, [userId]);

    const loadConversations = async () => {
        setIsLoading(true);
        try {
            const conversationsData = await apiService.getConversations();
            setConversations(conversationsData);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateRandomUuid = () => {
        const newUuid = UserIdManager.generateNewUserId();
        // Save to cookie and update context immediately
        UserIdManager.setUserId(newUuid);
        setUserId(newUuid);
    };

    const createNewConversation = async () => {
        setIsLoading(true);
        try {
            const newConversation = await apiService.createConversation('New Conversation');
            setConversations(prev => [newConversation, ...prev]);
            if (onConversationSelect) {
                onConversationSelect(newConversation.id);
            }
        } catch (error) {
            console.error('Error creating conversation:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectConversation = (conversationId: string) => {
        if (onConversationSelect) {
            onConversationSelect(conversationId);
        }
    };

    const openMeetingIndexModal = () => {
        setIsMeetingModalOpen(true);
    };

    const closeMeetingModal = () => {
        setIsMeetingModalOpen(false);
    };

    const sidebarClasses = [
        styles.sidebar,
        !isOpen && styles.sidebarCollapsed,
        isMobile && styles.sidebarMobile,
        isMobile && isOpen && styles.sidebarMobileOpen,
    ].filter(Boolean).join(' ');

    return (
        <div className={sidebarClasses}>
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

                <div className={styles.userIdContainer}>
                    <Text className={styles.userIdLabel}>ID người dùng:</Text>
                    <div className={styles.userIdInputWrapper}>
                        <Input
                            className={styles.userIdInput}
                            value={userId}
                            onChange={(_, data) => setUserId(data.value)}
                            placeholder="Nhập ID người dùng của bạn"
                        />
                        <Button
                            className={styles.generateUuidBtn}
                            icon={<CubeMultiple24Regular />}
                            onClick={generateRandomUuid}
                            title="Tạo UUID ngẫu nhiên"
                        />
                    </div>
                </div>

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
                {isLoading ? (
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

            <MeetingModal isOpen={isMeetingModalOpen} onClose={closeMeetingModal} />
        </div>
    );
};