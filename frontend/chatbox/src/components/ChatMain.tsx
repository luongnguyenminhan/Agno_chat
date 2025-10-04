import React, { useState, useRef, useEffect } from 'react';
import {
    makeStyles,
    tokens,
    Button,
    Textarea,
    Text,
} from '@fluentui/react-components';
import { Send24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
    chatMain: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: tokens.colorNeutralBackground1,
        overflow: 'hidden',
    },
    chatHeader: {
        padding: `${tokens.spacingVerticalL} ${tokens.spacingVerticalXL}`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    messageTimestamp: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
        alignSelf: 'flex-start',
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

interface Message {
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
}

export const ChatMain: React.FC = () => {
    const styles = useStyles();
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = () => {
        if (!currentMessage.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            content: currentMessage,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, newMessage]);
        setCurrentMessage('');
        setIsTyping(true);

        // Auto-resize textarea back to single line
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Simulate assistant response
        setTimeout(() => {
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: 'This is a simulated response from the assistant.',
                sender: 'assistant',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsTyping(false);
        }, 1000);
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
        <div className={styles.chatMain}>
            <div className={styles.chatHeader}>
                <div className={styles.conversationTitleDisplay}>
                    <span
                        className={`${styles.connectionStatus} ${isConnected ? styles.connectionStatusConnected : styles.connectionStatusDisconnected
                            }`}
                        title={isConnected ? 'Connected' : 'Disconnected'}
                    />
                    <Text>
                        {messages.length > 0 ? 'Active Conversation' : 'Select a conversation to start chatting'}
                    </Text>
                </div>
            </div>

            <div className={styles.chatMessages}>
                <div className={styles.messagesContainer}>
                    {messages.map((message) => (
                        <div key={message.id} className={styles.messageItem}>
                            <div
                                className={`${styles.messageContent} ${message.sender === 'user' ? styles.messageUser : styles.messageAssistant
                                    }`}
                            >
                                <Text>{message.content}</Text>
                            </div>
                            <Text className={styles.messageTimestamp}>
                                {message.timestamp.toLocaleTimeString()}
                            </Text>
                        </div>
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