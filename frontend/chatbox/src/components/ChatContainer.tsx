import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ConversationsSidebar } from './ConversationsSidebar';
import { ChatMain } from './ChatMain';

const useStyles = makeStyles({
    chatContainer: {
        display: 'flex',
        height: '100vh',
        maxWidth: '1400px',
        margin: '0 auto',
        backgroundColor: tokens.colorNeutralBackground1,
        boxShadow: tokens.shadow16,
    },
});

export const ChatContainer: React.FC = () => {
    const styles = useStyles();

    return (
        <div className={styles.chatContainer}>
            <ConversationsSidebar />
            <ChatMain />
        </div>
    );
};