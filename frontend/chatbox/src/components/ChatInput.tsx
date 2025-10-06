import {
    Button,
    makeStyles,
    tokens,
} from '@fluentui/react-components';
import { Send24Regular } from '@fluentui/react-icons';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import useMentionInput from './mentions/useMentionInput';
import MentionSuggestions from './mentions/MentionSuggestions';
import { serializeContenteditableToText } from './mentions/tokenUtils';

const useStyles = makeStyles({
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
        maxHeight: '120px',
        padding: '8px 12px',
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: tokens.colorNeutralBackground1,
        resize: 'none',
        outline: 'none',
        overflowY: 'auto',
    },
    sendBtn: {
        minHeight: '44px',
    },
    typingIndicator: {
        padding: `${tokens.spacingVerticalS} ${tokens.spacingVerticalL}`,
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
        fontStyle: 'italic',
    },
});

interface ChatInputProps {
    onSendMessage: (content: string, mentions: Array<{ entity_type: string; entity_id: string; offset_start: number; offset_end: number }>) => Promise<void>;
    disabled?: boolean;
    isTyping?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    disabled = false,
    isTyping = false,
}) => {
    const styles = useStyles();
    const editorRef = useRef<HTMLElement>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            console.log('🔍 Debounced search:', search);
        }, 300); // Reduced from 500ms to 300ms for better responsiveness

        return () => {
            clearTimeout(handler);
        };
    }, [search]);

    // Search function for mentions
    const searchMentions = useCallback(async (query: string) => {
        // Update search state to trigger debounced search
        setSearch(query);

        // If no query or debounced search not ready, return empty
        if (!query.trim() || !debouncedSearch.trim()) return [];

        try {
            console.log('🔍 Searching for mentions with query:', query, 'debounced:', debouncedSearch);
            console.log('📤 About to call API with search term:', debouncedSearch);

            // Use the search API for meetings with improved filtering
            const meetings = await apiService.searchMeetings(debouncedSearch);
            console.log('✅ Found meetings:', meetings.length, meetings.map(m => ({ id: m.id, title: m.title })));

            if (meetings.length === 0) {
                console.log('❌ No meetings found for query:', debouncedSearch);
                console.log('🔍 This means the API returned empty results for the search term');
                return [];
            }

            return meetings.slice(0, 8).map(meeting => ({
                id: meeting.id,
                name: `@${meeting.title}`, // Display short format directly in name
                type: 'meeting' as const,
            }));
        } catch (error) {
            console.error('💥 Error searching mentions:', error);
            return [];
        }
    }, [debouncedSearch]);

    const { state, actions } = useMentionInput({
        editorRef,
        search: searchMentions,
        limit: 8,
    });

    const handleMoveUp = () => actions.setFocusedIndex(Math.max(0, state.focusedIndex - 1));
    const handleMoveDown = () => actions.setFocusedIndex(Math.min(state.items.length - 1, state.focusedIndex + 1));

    const handleSendMessage = async () => {
        if (isEmpty || disabled || !editorRef.current) return;

        try {
            // Serialize content with mentions
            const { content, mentions } = serializeContenteditableToText(editorRef.current);

            if (!content.trim()) return;

            // Clear editor
            editorRef.current.innerHTML = '';
            setIsEmpty(true);

            await onSendMessage(content, mentions);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Handle mention input
        if (actions.onKeyDown(e)) {
            return;
        }

        // Handle send message
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInput = () => {
        actions.onInput();
        setIsEmpty(editorRef.current?.textContent?.trim() === '');
    };

    // Focus editor on mount
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
    }, []);

    return (
        <>
            {isTyping && (
                <div className={styles.typingIndicator}>
                    AI đang nhập...
                </div>
            )}

            <div className={styles.messageInputArea}>
                <div className={styles.messageInputContainer}>
                    <div
                        ref={editorRef as React.RefObject<HTMLDivElement>}
                        className={styles.messageInput}
                        contentEditable={!disabled}
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        data-placeholder="Nhập tin nhắn của bạn ở đây... (Enter để gửi, Shift+Enter để xuống dòng, @ để tìm kiếm meetings)"
                        style={{
                            color: tokens.colorNeutralForeground1,
                        }}
                        suppressContentEditableWarning={true}
                    />
                    <Button
                        className={styles.sendBtn}
                        icon={<Send24Regular />}
                        onClick={handleSendMessage}
                        disabled={isEmpty || disabled}
                    >
                        Gửi
                    </Button>
                </div>

                <MentionSuggestions
                    open={state.open}
                    position={state.position}
                    items={state.items}
                    focusedIndex={state.focusedIndex}
                    onSelect={(item) => {
                        actions.commit(item);
                        setIsEmpty(false);
                    }}
                    onMove={(dir: 'up' | 'down') => {
                        if (dir === 'up') handleMoveUp();
                        else handleMoveDown();
                    }}
                    onClose={actions.close}
                    labels={{
                        loading: 'Đang tìm kiếm...',
                        noResults: 'Không tìm thấy meeting nào phù hợp. Hãy thử từ khóa khác.',
                        searchPlaceholder: 'Tìm kiếm meetings...',
                    }}
                />
            </div>
        </>
    );
};
