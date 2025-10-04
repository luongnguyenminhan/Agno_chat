import React, { useState } from 'react';
import {
    makeStyles,
    tokens,
    Button,
    Input,
    Text,
} from '@fluentui/react-components';
import { Add24Regular, CubeMultiple24Regular, ClipboardTaskListLtr24Regular } from '@fluentui/react-icons';
import { MeetingModal } from './MeetingModal';

const useStyles = makeStyles({
    sidebar: {
        width: '320px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
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

interface Conversation {
    id: string;
    title: string;
    lastMessage?: string;
    messageCount: number;
    timestamp: Date;
}

export const ConversationsSidebar: React.FC = () => {
    const styles = useStyles();
    const [userId, setUserId] = useState('4c3b4f0f-8d99-42cd-9676-8a16a974c507');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

    const generateRandomUuid = () => {
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        setUserId(uuid);
    };

    const createNewConversation = () => {
        const newConversation: Conversation = {
            id: Date.now().toString(),
            title: 'New Conversation',
            messageCount: 0,
            timestamp: new Date(),
        };
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
    };

    const selectConversation = (conversationId: string) => {
        setActiveConversationId(conversationId);
    };

    const openMeetingIndexModal = () => {
        setIsMeetingModalOpen(true);
    };

    const closeMeetingModal = () => {
        setIsMeetingModalOpen(false);
    };

    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <Text className={styles.sidebarTitle}>Conversations</Text>

                <div className={styles.userIdContainer}>
                    <Text className={styles.userIdLabel}>User ID:</Text>
                    <div className={styles.userIdInputWrapper}>
                        <Input
                            className={styles.userIdInput}
                            value={userId}
                            onChange={(_, data) => setUserId(data.value)}
                            placeholder="Enter your user ID"
                        />
                        <Button
                            className={styles.generateUuidBtn}
                            icon={<CubeMultiple24Regular />}
                            onClick={generateRandomUuid}
                            title="Generate Random UUID"
                        />
                    </div>
                </div>

                <Button
                    className={styles.newChatBtn}
                    icon={<Add24Regular />}
                    onClick={createNewConversation}
                >
                    New Chat
                </Button>

                <Button
                    className={styles.indexMeetingBtn}
                    icon={<ClipboardTaskListLtr24Regular />}
                    onClick={openMeetingIndexModal}
                >
                    Index Meeting
                </Button>
            </div>

            <div className={styles.conversationsList}>
                {conversations.map((conversation) => (
                    <div
                        key={conversation.id}
                        className={`${styles.conversationItem} ${activeConversationId === conversation.id ? styles.conversationItemActive : ''
                            }`}
                        onClick={() => selectConversation(conversation.id)}
                    >
                        <Text className={styles.conversationTitle}>{conversation.title}</Text>
                        <div className={styles.conversationMeta}>
                            <Text>{conversation.timestamp.toLocaleDateString()}</Text>
                            {conversation.messageCount > 0 && (
                                <span className={styles.messageCount}>{conversation.messageCount}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <MeetingModal isOpen={isMeetingModalOpen} onClose={closeMeetingModal} />
        </div>
    );
};