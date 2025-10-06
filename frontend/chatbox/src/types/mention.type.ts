// Types for mention functionality, derived from api.ts types

// Mention structure for UI components (includes display properties)
export type Mention = {
    id: string;
    name: string;
    type: 'meeting' | 'file' | 'project';
};

// API mention structure from CreateMessageRequest
export type ApiMention = {
    entity_type: string;
    entity_id: string;
    offset_start: number;
    offset_end: number;
};

// Extended mention for internal use with additional metadata
export type MentionWithMetadata = ApiMention & {
    original_name?: string;
};

// Mention occurrence for tokenization
export type MentionOccurrence = ApiMention & {
    length: number;
};

// Type for entity types (export for backward compatibility)
export type MentionType = 'meeting' | 'file' | 'project';

// Search item for mention suggestions
export type MentionSearchItem = {
    id: string;
    name: string;
    type: MentionType;
};

// Parsed mention from API service
export type ParsedMention = ApiMention;
