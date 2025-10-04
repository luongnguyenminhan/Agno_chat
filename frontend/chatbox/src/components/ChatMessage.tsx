/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { makeStyles, tokens } from '@fluentui/react-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCodeBlock } from './MessageCodeBlock';

const useStyles = makeStyles({
  userMessage: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  userBubble: {
    maxWidth: '80%',
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorBrandBackground,
    color: "white",
    border: `1px solid ${tokens.colorBrandForeground1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  userMessageInner: {
    display: 'flex',
    alignItems: 'flex-start',
    columnGap: tokens.spacingHorizontalS,
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  userContent: {
    flex: 1,
    minWidth: 0,
  },
  userContentText: {
    marginBottom: tokens.spacingVerticalS,
    lineHeight: 1.5,
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  userTimestamp: {
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalS,
    color: 'rgba(255,255,255,0.7)',
  },
  assistantMessage: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalS,
  },
  assistantHeader: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
  },
  assistantAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorBrandBackgroundInverted,
    overflow: 'hidden',
  },
  assistantLabel: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  assistantTimestamp: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  assistantContent: {
    marginLeft: '44px',
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalM,
  },
  copyButton: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
});

interface Message {
  id: string;
  message_type: 'user' | 'assistant';
  content: string;
  created_at: string;
  error?: boolean;
}

interface User {
  profile_picture?: string;
  name?: string;
  username?: string;
}

interface ChatMessageProps {
  message: Message;
  user?: User;
}

export function ChatMessage({
  message,
}: ChatMessageProps) {
  const styles = useStyles();


  const renderContentWithMentions = (text: string, isUser: boolean) => {
    // Highlight @meeting, @file, @project (no uuid parsing)
    const regex = /@(?:meeting|file|project)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <strong
          key={match.index}
          style={{
            color: isUser ? "#fff" : "#0b5cad",
            fontWeight: "bold",
          }}
        >
          {match[0]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return <>{parts}</>;
  };

  if (message.message_type === 'user') {
    return (
      <div className={styles.userMessage}>
        <div className={styles.userBubble}>
          <div className={styles.userMessageInner}>
            <div className={styles.userContent}>
              <p className={styles.userContentText}>
                {renderContentWithMentions(message.content, true)}
              </p>
              <p className={styles.userTimestamp}>
                {new Date(message.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className={styles.assistantMessage}>
      {/* Bot Avatar and Timestamp */}
      <div className={styles.assistantHeader}>
        <span className={styles.assistantLabel}>
          Assistant
        </span>
        <span className={styles.assistantTimestamp}>
          {new Date(message.created_at).toLocaleTimeString()}
        </span>
      </div>

      {/* Bot Message Content - Enhanced responsive markdown */}
      <div className={styles.assistantContent}>
        <div className="prose prose-sm max-w-none prose-gray dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: (props: any) => {
                const { inline, className, children, ...rest } = props;
                const match = /language-(\w+)/.exec(className || '');
                const codeContent = String(children).replace(/\n$/, '');
                const language = match ? match[1] : 'text';

                // Handle inline code with simple styling
                if (inline) {
                  return (
                    <code
                      style={{
                        backgroundColor: tokens.colorNeutralBackground3,
                        color: tokens.colorNeutralForeground1,
                        paddingLeft: tokens.spacingHorizontalXS,
                        paddingRight: tokens.spacingHorizontalXS,
                        paddingTop: tokens.spacingVerticalXS,
                        paddingBottom: tokens.spacingVerticalXS,
                        borderRadius: tokens.borderRadiusSmall,
                        fontSize: tokens.fontSizeBase300,
                        fontFamily: tokens.fontFamilyMonospace,
                        border: `1px solid ${tokens.colorNeutralStroke1}`,
                        boxShadow: tokens.shadow2,
                      }}
                      {...rest}
                    >
                      {children}
                    </code>
                  );
                }

                // Handle block code with MessageCodeBlock
                return (
                  <MessageCodeBlock
                    code={codeContent}
                    language={language}
                    variant={match ? 'header' : 'floating'}
                  />
                );
              },
              blockquote: (props: any) => (
                <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 my-4 rounded-r-lg dark:bg-blue-950 dark:border-blue-400">
                  <div className="text-blue-800 text-sm mb-2 font-medium dark:text-blue-200">
                    System Prompt
                  </div>
                  <div className="text-gray-900 italic dark:text-gray-100">
                    {props.children}
                  </div>
                </blockquote>
              ),
              h1: (props: any) => (
                <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100" {...props}>
                  {props.children}
                </h1>
              ),
              h2: (props: any) => (
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100" {...props}>
                  {props.children}
                </h2>
              ),
              h3: (props: any) => (
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100" {...props}>
                  {props.children}
                </h3>
              ),
              ul: (props: any) => (
                <ul className="list-disc pl-6 mb-4 text-gray-900 dark:text-gray-100" {...props}>
                  {props.children}
                </ul>
              ),
              ol: (props: any) => (
                <ol className="list-decimal pl-6 mb-4 text-gray-900 dark:text-gray-100" {...props}>
                  {props.children}
                </ol>
              ),
              li: (props: any) => (
                <li className="mb-1 text-gray-900 dark:text-gray-100" {...props}>
                  {props.children}
                </li>
              ),
              p: (props: any) => (
                <p className="mb-3 leading-relaxed text-gray-900 dark:text-gray-100" {...props}>
                  {props.children}
                </p>
              ),
              a: (props: any) => (
                <a
                  href={props.href}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                >
                  {props.children}
                </a>
              ),
              table: (props: any) => (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border border-gray-300 rounded-lg dark:border-gray-600" {...props}>
                    {props.children}
                  </table>
                </div>
              ),
              th: (props: any) => (
                <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" {...props}>
                  {props.children}
                </th>
              ),
              td: (props: any) => (
                <td className="border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-gray-100" {...props}>
                  {props.children}
                </td>
              ),
              strong: (props: any) => (
                <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
                  {props.children}
                </strong>
              ),
              em: (props: any) => (
                <em className="italic text-gray-900 dark:text-gray-100" {...props}>
                  {props.children}
                </em>
              )
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}