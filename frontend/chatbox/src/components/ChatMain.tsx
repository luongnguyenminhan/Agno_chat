/* eslint-disable react-hooks/exhaustive-deps */
import {
    Button,
    makeStyles,
    Text,
    Textarea,
    tokens,
} from '@fluentui/react-components';
import { PanelRight24Regular, Send24Regular } from '@fluentui/react-icons';
import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { apiService } from '../services/api';
import type { Message } from '../services/api';

// Lazy load the ChatMessage component to reduce initial bundle size
const ChatMessage = lazy(() => import('./ChatMessage').then(module => ({ default: module.ChatMessage })));

const useStyles = makeStyles({
    chatMain: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: tokens.colorNeutralBackground1,
        overflow: 'hidden',
        width: '100%',
    },
    chatMainFullWidth: {
        width: '100%',
    },
    chatHeader: {
        padding: `${tokens.spacingVerticalL} ${tokens.spacingVerticalL}`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: tokens.spacingHorizontalS,
    },
    mobileToggleButton: {
        display: 'none',
        '@media (max-width: 767px)': {
            display: 'flex',
        },
    },
    conversationTitleDisplay: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalS,
    },
    connectionStatus: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        display: 'inline-block',
    },
    connectionStatusConnected: {
        backgroundColor: tokens.colorStatusSuccessBackground1,
    },
    connectionStatusDisconnected: {
        backgroundColor: tokens.colorStatusDangerBackground1,
    },
    chatMessages: {
        flex: 1,
        overflowY: 'auto',
        padding: tokens.spacingVerticalL,
    },
    messagesContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalM,
    },
    messageItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalXXS,
    },
    messageContent: {
        padding: tokens.spacingVerticalS,
        borderRadius: tokens.borderRadiusMedium,
        maxWidth: '70%',
        wordWrap: 'break-word',
    },
    messageUser: {
        alignSelf: 'flex-end',
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    messageAssistant: {
        alignSelf: 'flex-start',
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground1,
    },
    typingIndicator: {
        padding: `${tokens.spacingVerticalS} ${tokens.spacingVerticalL}`,
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
        fontStyle: 'italic',
    },
    messageInputArea: {
        padding: tokens.spacingVerticalL,
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground1,
    },
    messageInputContainer: {
        display: 'flex',
        gap: tokens.spacingHorizontalS,
        alignItems: 'flex-end',
    },
    messageInput: {
        flex: 1,
        minHeight: '44px',
        resize: 'none',
    },
    sendBtn: {
        minHeight: '44px',
    },
});

interface ChatMainProps {
    sidebarOpen: boolean;
    isMobile: boolean;
    onToggleSidebar: () => void;
    activeConversationId?: string | null;
    onConversationChange?: (conversationId: string) => void;
}

export const ChatMain: React.FC<ChatMainProps> = ({
    sidebarOpen,
    isMobile,
    onToggleSidebar,
    activeConversationId,
}) => {
    const styles = useStyles();

    const chatMainClasses = [
        styles.chatMain,
        !sidebarOpen && !isMobile && styles.chatMainFullWidth,
    ].filter(Boolean).join(' ');

    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [conversationTitle, setConversationTitle] = useState('Select a conversation to start chatting');
    const [eventSource, setEventSource] = useState<EventSource | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (activeConversationId) {
            loadConversationMessages(activeConversationId);
            connectToRealTimeUpdates(activeConversationId);
        } else {
            setMessages([]);
            setConversationTitle('Select a conversation to start chatting');
            disconnectRealTimeUpdates();
        }

        return () => {
            disconnectRealTimeUpdates();
        };
    }, [activeConversationId]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            disconnectRealTimeUpdates();
        };
    }, []);

    const loadConversationMessages = async (conversationId: string) => {
        try {
            setIsTyping(true);
            const messagesData = await apiService.getConversationMessages(conversationId);
            setMessages(messagesData);

            // Update conversation title (you might want to fetch this separately)
            setConversationTitle('Active Conversation');
        } catch (error) {
            console.error('Error loading conversation messages:', error);
            setConversationTitle('Error loading conversation');
        } finally {
            setIsTyping(false);
        }
    };

    const connectToRealTimeUpdates = (conversationId: string) => {
        disconnectRealTimeUpdates();

        try {
            const newEventSource = apiService.connectToConversation(conversationId, (message: Message) => {
                setMessages(prev => [...prev, message]);
                setIsTyping(false); // Hide typing indicator when message arrives
            });

            setEventSource(newEventSource);
            setIsConnected(true);
        } catch (error) {
            console.error('Error connecting to real-time updates:', error);
            setIsConnected(false);
        }
    };

    const disconnectRealTimeUpdates = () => {
        if (eventSource) {
            apiService.disconnectSSE(eventSource);
            setEventSource(null);
            setIsConnected(false);
        }
    };

    const handleSendMessage = async () => {
        if (!currentMessage.trim() || !activeConversationId) return;

        const content = currentMessage.trim();
        setCurrentMessage('');

        // Auto-resize textarea back to single line
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Parse mentions from content
        const mentions = apiService.parseMentions(content);

        // Create optimistic user message
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`, // Temporary ID
            message_type: 'user',
            content,
            created_at: new Date().toISOString(),
        };

        // Add message to UI immediately (optimistic update)
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            setIsTyping(true);
            await apiService.sendMessage(activeConversationId, {
                content,
                mentions,
            });

            // Real-time update will handle the actual message from server
        } catch (error) {
            console.error('Error sending message:', error);
            setIsTyping(false);

            // Remove optimistic message on error
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));

            // Restore the message content if sending failed
            setCurrentMessage(content);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentMessage(e.target.value);

        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    return (
        <div className={chatMainClasses}>
            <div className={styles.chatHeader}>
                <div className={styles.conversationTitleDisplay}>
                    {isMobile && (
                        <Button
                            className={styles.mobileToggleButton}
                            icon={<PanelRight24Regular />}
                            onClick={onToggleSidebar}
                            size="small"
                            appearance="subtle"
                        />
                    )}
                    <span
                        className={`${styles.connectionStatus} ${isConnected ? styles.connectionStatusConnected : styles.connectionStatusDisconnected
                            }`}
                        title={isConnected ? 'Connected' : 'Disconnected'}
                    />
                    <Text>
                        {conversationTitle}
                    </Text>
                </div>
            </div>

            <div className={styles.chatMessages}>
                <div className={styles.messagesContainer}>
                    {messages.map((message) => (
                        <Suspense key={message.id} fallback={
                            <div style={{ padding: tokens.spacingVerticalM, textAlign: 'center' }}>
                                Loading message...
                            </div>
                        }>
                            <ChatMessage
                                message={message}
                                user={undefined} // You can pass user data here if available
                            />
                        </Suspense>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {isTyping && (
                <div className={styles.typingIndicator}>
                    AI is typing...
                </div>
            )}

            <div className={styles.messageInputArea}>
                <div className={styles.messageInputContainer}>
                    <Textarea
                        ref={textareaRef}
                        className={styles.messageInput}
                        value={currentMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                        rows={1}
                    />
                    <Button
                        className={styles.sendBtn}
                        icon={<Send24Regular />}
                        onClick={handleSendMessage}
                        disabled={!currentMessage.trim()}
                    >
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
};