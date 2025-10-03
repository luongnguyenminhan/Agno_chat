class ChatApp {
    constructor() {
        this.currentConversationId = null;
        this.eventSource = null;
        this.userId = this.getUserId();
        this.apiBase = 'http://localhost:8000/api/v1';
        this.conversations = [];
        this.messages = [];
        this.currentTaskId = null;

        this.initializeElements();
        this.bindEvents();
        this.updateConnectionStatus('disconnected'); // Initial status
        this.loadConversations();
    }

    initializeElements() {
        // Sidebar elements
        this.sidebar = document.getElementById('conversations-sidebar');
        this.conversationsList = document.getElementById('conversations-list');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.userIdInput = document.getElementById('user-id-input');
        this.generateUuidBtn = document.getElementById('generate-uuid-btn');

        // Chat elements
        this.chatContainer = document.getElementById('chat-container');
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');

        // Header elements
        this.conversationTitle = document.getElementById('conversation-title');
        this.connectionStatus = document.getElementById('connection-status');
        this.typingIndicator = document.getElementById('typing-indicator');
    }

    bindEvents() {
        // New conversation button
        this.newChatBtn?.addEventListener('click', () => this.createNewConversation());

        // Send message button
        this.sendBtn?.addEventListener('click', () => this.sendMessage());

        // Enter key in message input
        this.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize message input
        this.messageInput?.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });

        // User ID input change
        this.userIdInput?.addEventListener('change', () => this.onUserIdChange());
        this.userIdInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.onUserIdChange();
            }
        });

        // Generate UUID button
        this.generateUuidBtn?.addEventListener('click', () => this.generateRandomUuid());

        // Page visibility change handler
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

        // Window beforeunload handler to cleanup SSE connections
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    getUserId() {
        // Read user ID from input field, fallback to demo user
        const userId = this.userIdInput?.value?.trim();
        return userId || '4c3b4f0f-8d99-42cd-9676-8a16a974c507';
    }

    onUserIdChange() {
        // Close existing SSE connection
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        // Reset current conversation and messages
        this.currentConversationId = null;
        this.messages = [];
        this.currentTaskId = null;

        // Hide typing indicator
        this.hideTypingIndicator();

        // Clear conversation title
        if (this.conversationTitle) {
            this.conversationTitle.textContent = 'Select a conversation to start chatting';
        }

        // Clear chat messages
        if (this.chatMessages) {
            this.chatMessages.innerHTML = '<div class="messages-container"></div>';
        }

        // Reload conversations with new user ID
        this.loadConversations();
    }

    generateRandomUuid() {
        // Generate a random UUID v4
        const uuid = this.generateUUIDv4();

        // Set the UUID in the input field
        if (this.userIdInput) {
            this.userIdInput.value = uuid;
            // Trigger the user ID change to refresh the app
            this.onUserIdChange();
        }
    }

    generateUUIDv4() {
        // Use crypto.randomUUID() if available (modern browsers)
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        // Fallback UUID v4 generator for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async loadConversations() {
        try {
            const response = await fetch(`${this.apiBase}/conversations`, {
                headers: {
                    'current-user-id': this.userId
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.conversations = data.data;
                this.renderConversations();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    renderConversations() {
        if (!this.conversationsList) return;

        this.conversationsList.innerHTML = '';

        this.conversations.forEach(conversation => {
            const conversationEl = document.createElement('div');
            conversationEl.className = `conversation-item ${conversation.id === this.currentConversationId ? 'active' : ''}`;
            conversationEl.innerHTML = `
                <div class="conversation-title">${conversation.title || 'Untitled Conversation'}</div>
                <div class="conversation-meta">
                    <span class="message-count">${conversation.message_count || 0} messages</span>
                    <span class="conversation-date">${this.formatDate(conversation.updated_at)}</span>
                </div>
            `;

            conversationEl.addEventListener('click', () => this.loadConversation(conversation.id));
            this.conversationsList.appendChild(conversationEl);
        });
    }

    async createNewConversation() {
        try {
            const response = await fetch(`${this.apiBase}/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'current-user-id': this.userId
                },
                body: JSON.stringify({
                    title: 'New Conversation'
                })
            });

            if (response.ok) {
                const data = await response.json();
                const conversation = data.data;
                this.conversations.unshift(conversation);
                this.renderConversations();
                // Hide typing indicator when creating new conversation
                this.hideTypingIndicator();
                this.loadConversation(conversation.id);
            }
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
    }

    async loadConversation(conversationId) {
        try {
            // Load conversation details with messages
            const response = await fetch(`${this.apiBase}/conversations/${conversationId}/messages?limit=100`, {
                headers: {
                    'current-user-id': this.userId
                }
            });

            if (response.ok) {
                const data = await response.json();
                const conversation = data.data;

                this.currentConversationId = conversationId;
                this.currentTaskId = null;

                // Hide typing indicator when loading new conversation
                this.hideTypingIndicator();

                // Load messages with proper format (clear any temporary messages first)
                this.messages = this.messages.filter(msg => !msg.isTemporary);

                if (conversation.messages && conversation.messages.length > 0) {
                    const loadedMessages = conversation.messages.map(msg => ({
                        id: msg.id,
                        message_type: msg.role || msg.message_type,
                        content: msg.content,
                        created_at: msg.timestamp || msg.created_at
                    }));

                    // Merge loaded messages with existing ones, avoiding duplicates
                    loadedMessages.forEach(loadedMsg => {
                        const existingMsg = this.messages.find(msg =>
                            msg.id === loadedMsg.id ||
                            (msg.content === loadedMsg.content && msg.message_type === loadedMsg.message_type)
                        );
                        if (!existingMsg) {
                            this.messages.push(loadedMsg);
                        }
                    });
                }

                // Update active conversation in sidebar
                this.renderConversations();

                // Update conversation title
                if (this.conversationTitle) {
                    this.conversationTitle.textContent = conversation.title || 'Untitled Conversation';
                }

                // Render messages
                this.renderMessages();

                // Connect to SSE for real-time updates
                this.connectSSE(conversationId);

                // Scroll to bottom
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    }

    renderMessages() {
        if (!this.chatMessages) return;

        // Clear existing messages
        this.chatMessages.innerHTML = '<div class="messages-container"></div>';
        const container = this.chatMessages.querySelector('.messages-container');

        this.messages.forEach(message => {
            // Generate message ID for checking
            let messageId;
            if (message.isTemporary) {
                messageId = message.id; // Use temp ID for temporary messages
            } else {
                messageId = message.id || `${message.message_type}-${message.created_at}`;
            }

            // Check if message element already exists
            const existingMessage = container.querySelector(`[data-message-id="${messageId}"]`);
            if (!existingMessage) {
                this.addMessageToChat(message, container, message.error);
            }
        });

        this.scrollToBottom();
    }

    addMessageToChat(message, container = null, isError = false) {
        const targetContainer = container || this.chatMessages;
        if (!targetContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.message_type === 'user' ? 'user-message' : 'ai-message'}`;

        // Generate unique message ID (handle temporary messages)
        let messageId;
        if (message.isTemporary) {
            messageId = message.id; // Use temp ID for temporary messages
        } else {
            messageId = message.id || `${message.message_type}-${message.created_at}`;
        }
        messageEl.setAttribute('data-message-id', messageId);

        const timestamp = new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        const errorClass = isError ? 'error-message' : '';
        messageEl.innerHTML = `
            <div class="message-content ${errorClass}">${this.escapeHtml(message.content)}</div>
            <div class="message-time">${timestamp}</div>
        `;

        targetContainer.appendChild(messageEl);
    }


    async sendMessage() {
        const content = this.messageInput?.value?.trim();
        if (!content || !this.currentConversationId) return;

        // Clear input immediately
        if (this.messageInput) {
            this.messageInput.value = '';
            this.messageInput.style.height = 'auto';
        }

        // Create and display user message immediately for better UX
        const tempUserMessage = {
            id: `temp-${Date.now()}`,
            message_type: 'user',
            content: content,
            created_at: new Date().toISOString(),
            isTemporary: true
        };

        this.messages.push(tempUserMessage);
        this.renderMessages();
        this.scrollToBottom();

        try {
            // Show typing indicator as soon as we start the API call
            this.showTypingIndicator();
            const response = await fetch(`${this.apiBase}/conversations/${this.currentConversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'current-user-id': this.userId
                },
                body: JSON.stringify({
                    content: content,
                    mentions: [] // For now, no mentions support in UI
                })
            });

            if (response.ok) {
                const data = await response.json();

                // Replace temporary user message with real one
                if (data.data.user_message) {
                    const tempIndex = this.messages.findIndex(msg => msg.id === tempUserMessage.id);
                    if (tempIndex !== -1) {
                        this.messages[tempIndex] = {
                            id: data.data.user_message.id,
                            message_type: 'user',
                            content: data.data.user_message.content,
                            created_at: data.data.user_message.timestamp,
                            isTemporary: false
                        };
                    }
                }

                // Show typing indicator for AI processing
                this.showTypingIndicator();

                // Store task_id for tracking if needed
                if (data.data.task_id) {
                    console.log('Background AI processing started with task_id:', data.data.task_id);
                    // You could store this for tracking purposes if needed
                    this.currentTaskId = data.data.task_id;
                }

                // message_count is now provided by API via hybrid property
                // No need to calculate client-side

                this.renderMessages();
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error sending message:', error);

            // Hide typing indicator on error
            this.hideTypingIndicator();

            // Remove temporary message if API call failed
            const tempIndex = this.messages.findIndex(msg => msg.id === tempUserMessage.id);
            if (tempIndex !== -1) {
                this.messages.splice(tempIndex, 1);
                this.renderMessages();
            }

            // Restore the message content if sending failed
            if (this.messageInput) {
                this.messageInput.value = content;
            }
        }
    }

    disconnectSSE() {
        // Close existing SSE connection if it exists
        if (this.eventSource) {
            console.log(`Disconnecting SSE for conversation: ${this.currentConversationId}`);
            this.eventSource.close();
            this.eventSource = null;
            this.updateConnectionStatus('disconnected');
        }
        // Hide typing indicator when disconnecting
        this.hideTypingIndicator();
    }

    connectSSE(conversationId) {
        // Disconnect any existing SSE connection first
        this.disconnectSSE();

        // Only connect if this is the currently selected conversation
        if (this.currentConversationId !== conversationId) {
            console.log(`Skipping SSE connection for conversation ${conversationId} - not currently selected`);
            return;
        }

        console.log(`Connecting SSE for conversation: ${conversationId}`);

        // Connect to SSE endpoint
        this.eventSource = new EventSource(`${this.apiBase}/conversations/${conversationId}/events`);

        // Update connection status to connected
        this.updateConnectionStatus('connected');

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'chat_message' && data.message) {
                    // Double-check that this message is for the currently selected conversation
                    if (this.currentConversationId !== conversationId) {
                        console.log(`Ignoring SSE message for non-selected conversation: ${conversationId}`);
                        return;
                    }

                    // Hide typing indicator when any message arrives (including errors)
                    this.hideTypingIndicator();

                    // Check if message already exists to prevent duplicates
                    const existingMessage = this.messages.find(msg =>
                        msg.id === data.message.id ||
                        (msg.content === data.message.content && msg.message_type === data.message.message_type)
                    );
                    if (!existingMessage) {
                        // Ensure proper format
                        const formattedMessage = {
                            id: data.message.id,
                            message_type: data.message.message_type,
                            content: data.message.content,
                            created_at: data.message.created_at,
                            error: data.message.error || false
                        };
                        this.messages.push(formattedMessage);
                        this.renderMessages();
                        this.scrollToBottom();
                    }
                } else if (data.type === 'heartbeat') {
                    // Update heartbeat timestamp for connection health monitoring
                    this.lastHeartbeat = Date.now();
                } else if (data.type === 'connection_timeout') {
                    console.log(`SSE connection timeout for conversation: ${conversationId}`);
                    this.disconnectSSE();
                }
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error(`SSE connection error for conversation ${conversationId}:`, error);
            // Update status to error before disconnecting
            this.updateConnectionStatus('error');
            // Auto-disconnect on error to prevent connection leaks
            this.disconnectSSE();
        };

        // Track heartbeat for connection health
        this.lastHeartbeat = Date.now();
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden - disconnect SSE to save resources
            console.log('Page hidden - disconnecting SSE');
            this.hideTypingIndicator();
            this.disconnectSSE();
        } else {
            // Page is visible - reconnect to current conversation if we have one
            if (this.currentConversationId) {
                console.log('Page visible - reconnecting SSE for conversation:', this.currentConversationId);
                this.connectSSE(this.currentConversationId);
            }
        }
    }

    cleanup() {
        // Cleanup SSE connection before page unload
        console.log('Cleaning up SSE connections before page unload');
        this.hideTypingIndicator();
        this.disconnectSSE();
    }

    updateConnectionStatus(status) {
        // Update connection status indicator
        if (this.connectionStatus) {
            this.connectionStatus.className = `connection-status ${status}`;

            // Update tooltip
            const statusText = {
                'connected': 'Connected - Receiving real-time updates',
                'disconnected': 'Disconnected',
                'error': 'Connection Error'
            };
            this.connectionStatus.title = statusText[status] || 'Unknown Status';
        }
    }

    scrollToBottom() {
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();

        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    showTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'block';
        }
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
