/* eslint-disable @typescript-eslint/no-explicit-any */
// API service layer for chat application
// Use environment variable for API base URL, fallback to relative path for development
// const API_BASE = typeof __API_BASE_URL__ !== 'undefined'
//     ? `${__API_BASE_URL__}/api/v1`
//     : '/api/v1';
import { AccessTokenManager, UserIdManager } from '../utils/cookie';

const API_BASE = 'https://chat.wc504.io.vn/api/v1';
export interface Conversation {
    id: string;
    title: string;
    message_count?: number;
    updated_at: string;
    created_at?: string;
}

export interface Message {
    id: string;
    message_type: 'user' | 'assistant';
    content: string;
    created_at: string;
    error?: boolean;
}

export interface CreateMessageRequest {
    content: string;
    mentions?: Array<{
        entity_type: string;
        entity_id: string;
        offset_start: number;
        offset_end: number;
    }>;
}

export interface CreateMessageResponse {
    data: {
        user_message: Message;
        task_id?: string;
    };
}

export interface MeetingIndexRequest {
    meeting_id: string;
    transcript?: string;
    meeting_note_file?: File;
    current_user_id: string;
}

export interface MeetingIndexResponse {
    success: boolean;
    data?: {
        processed_items: string[];
    };
    message?: string;
}

export interface Meeting {
    id: string;
    title: string;
    meeting_date: string;
    organizer_name: string;
    status: string;
}

export interface MeetingsResponse {
    error_code: number;
    message: string;
    data: {
        items: Meeting[];
        paging: {
            total: number;
            total_pages: number;
            page: number;
            page_size: number;
        };
    };
}

class ApiService {
    private userId: string = '4c3b4f0f-8d99-42cd-9676-8a16a974c507';

    setUserId(userId: string) {
        this.userId = userId;
    }

    getUserId(): string {
        return this.userId;
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'current-user-id': this.userId,
        };

        // Add Authorization header if access token is available
        const accessToken = AccessTokenManager.getAccessToken();
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        return headers;
    }

    // Conversation APIs
    async getConversations(): Promise<Conversation[]> {
        try {
            const response = await fetch(`${API_BASE}/conversations`, {
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch conversations: ${response.status}`);
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching conversations:', error);
            throw error;
        }
    }

    async createConversation(title: string = 'New Conversation'): Promise<Conversation> {
        try {
            const response = await fetch(`${API_BASE}/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getHeaders(),
                },
                body: JSON.stringify({ title }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create conversation: ${response.status}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error creating conversation:', error);
            throw error;
        }
    }

    async getConversationMessages(conversationId: string, limit: number = 100): Promise<Message[]> {
        try {
            const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages?limit=${limit}`, {
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch messages: ${response.status}`);
            }

            const data = await response.json();
            const conversation = data.data;

            if (!conversation?.messages) {
                return [];
            }

            return conversation.messages.map((msg: any) => ({
                id: msg.id,
                message_type: msg.role || msg.message_type,
                content: msg.content,
                created_at: msg.timestamp || msg.created_at,
            }));
        } catch (error) {
            console.error('Error fetching conversation messages:', error);
            throw error;
        }
    }

    async sendMessage(conversationId: string, request: CreateMessageRequest): Promise<CreateMessageResponse> {
        try {
            const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getHeaders(),
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async indexMeeting(request: MeetingIndexRequest): Promise<MeetingIndexResponse> {
        try {
            const formData = new FormData();
            formData.append('meeting_id', request.meeting_id);
            formData.append('current_user_id', request.current_user_id);

            if (request.transcript) {
                formData.append('transcript', request.transcript);
            }

            if (request.meeting_note_file) {
                formData.append('meeting_note_file', request.meeting_note_file);
            }

            const response = await fetch(`${API_BASE}/meetings/index`, {
                method: 'POST',
                headers: {
                    ...this.getHeaders(),
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Failed to index meeting: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error indexing meeting:', error);
            throw error;
        }
    }

    async searchMeetings(searchTerm: string): Promise<Meeting[]> {
        try {
            const baseUrl = 'https://frecord.dev.meobeo.ai/api/v1/meetings/';
            const params = new URLSearchParams({
                page: '1',
                page_size: '16'
            });

            if (searchTerm.trim()) {
                // Normalize search term to handle special characters
                const filters = [{
                    field: 'title',
                    operator: 'contains',
                    value: searchTerm
                }];
                params.set('filters_json', JSON.stringify(filters));
            }

            const response = await fetch(`${baseUrl}?${params.toString()}`, {
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to search meetings: ${response.status}`);
            }

            const data: MeetingsResponse = await response.json();
            console.log('📥 API Response:', data);
            console.log('🎯 Found items:', data.data?.items?.length || 0);
            return data.data.items || [];
        } catch (error) {
            console.error('Error searching meetings:', error);
            return [];
        }
    }

    // SSE connection for real-time updates
    connectToConversation(conversationId: string, onMessage: (message: Message) => void): EventSource {
        const eventSource = new EventSource(`${API_BASE}/conversations/${conversationId}/events`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'chat_message' && data.message) {
                    const message: Message = {
                        id: data.message.id,
                        message_type: data.message.message_type,
                        content: data.message.content,
                        created_at: data.message.created_at,
                        error: data.message.error || false,
                    };
                    onMessage(message);
                }
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
        };

        return eventSource;
    }

    disconnectSSE(eventSource: EventSource | null) {
        if (eventSource) {
            eventSource.close();
        }
    }

    // User APIs
    async getUserInfo(): Promise<any> {
        try {
            const response = await fetch(`https://frecord.dev.meobeo.ai/api/v1/users/me`, {
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch user info: ${response.status}`);
            }

            const data = await response.json();

            // Save user ID from response
            if (data?.data?.id) {
                UserIdManager.setUserId(data.data.id);
                this.setUserId(data.data.id);
            }

            return data;
        } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
        }
    }

    // Utility functions
    generateUUID(): string {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        const today = new Date();

        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    highlightMentions(content: string): string {
        // Updated pattern to match @{type}{name} format
        const mentionRegex = /@\{(\w+)\}\{([^}]+)\}/g;
        return this.escapeHtml(content).replace(mentionRegex, '<span class="mention">$&</span>');
    }

    parseMentions(content: string): Array<{ entity_type: string; entity_id: string; offset_start: number; offset_end: number }> {
        // Updated to handle @{type}{name} format
        const mentionRegex = /@\{(\w+)\}\{([^}]+)\}/g;
        const mentions = [];
        let match;

        while ((match = mentionRegex.exec(content)) !== null) {
            const [, entityType, entityName] = match;
            mentions.push({
                entity_type: entityType,
                entity_id: entityName, // Now using name directly as ID for the new format
                offset_start: match.index,
                offset_end: match.index + match[0].length,
            });
        }

        return mentions;
    }

    async resolveMeetingMentions(mentions: Array<{ entity_type: string; entity_id: string; offset_start: number; offset_end: number; original_name?: string }>): Promise<Array<{ entity_type: string; entity_id: string; offset_start: number; offset_end: number }>> {
        // With the new @{type}{name} format, mentions are already resolved
        // entity_id now contains the name directly, no need for resolution
        return mentions.map(mention => ({
            entity_type: mention.entity_type,
            entity_id: mention.entity_id,
            offset_start: mention.offset_start,
            offset_end: mention.offset_end,
        }));
    }
}

export const apiService = new ApiService();
