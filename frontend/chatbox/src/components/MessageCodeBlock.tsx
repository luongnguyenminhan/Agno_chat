import { makeStyles, tokens } from '@fluentui/react-components';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const useStyles = makeStyles({
    headerContainer: {
        display: 'flex',
        flexDirection: 'column',
        borderRadius: tokens.borderRadiusMedium,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        backgroundColor: tokens.colorNeutralBackground1,
        marginTop: tokens.spacingVerticalM,
        marginBottom: tokens.spacingVerticalM,
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '36px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        paddingLeft: tokens.spacingHorizontalM,
        paddingRight: tokens.spacingHorizontalM,
        fontSize: tokens.fontSizeBase200,
        fontFamily: tokens.fontFamilyBase,
        color: tokens.colorNeutralForeground3,
        fontWeight: tokens.fontWeightMedium,
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalXS,
    },
    floatingContainer: {
        display: 'flex',
        flexDirection: 'column',
        borderRadius: tokens.borderRadiusMedium,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        backgroundColor: tokens.colorNeutralBackground3,
        marginTop: tokens.spacingVerticalM,
        marginBottom: tokens.spacingVerticalM,
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        position: 'relative',
    },
    floatingActions: {
        position: 'absolute',
        top: tokens.spacingVerticalS,
        right: tokens.spacingVerticalS,
        display: 'flex',
        columnGap: tokens.spacingHorizontalXS,
    },
    inlineContainer: {
        display: 'flex',
        flexDirection: 'column',
        borderRadius: tokens.borderRadiusMedium,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        backgroundColor: tokens.colorNeutralBackground3,
        marginTop: tokens.spacingVerticalS,
        marginBottom: tokens.spacingVerticalS,
        position: 'relative',
        overflow: 'hidden',
    },
    inlineActions: {
        position: 'absolute',
        top: tokens.spacingVerticalXS,
        right: tokens.spacingVerticalXS,
        display: 'flex',
        columnGap: tokens.spacingHorizontalXS,
    },
    actionButton: {
        fontSize: tokens.fontSizeBase200,
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        paddingTop: tokens.spacingVerticalXS,
        paddingBottom: tokens.spacingVerticalXS,
        paddingLeft: tokens.spacingHorizontalS,
        paddingRight: tokens.spacingHorizontalS,
    },
    actionButtonFloating: {
        fontSize: tokens.fontSizeBase200,
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        paddingTop: tokens.spacingVerticalXS,
        paddingBottom: tokens.spacingVerticalXS,
        paddingLeft: tokens.spacingHorizontalS,
        paddingRight: tokens.spacingHorizontalS,
    },
    languageLabel: {
        fontWeight: tokens.fontWeightMedium,
    },
});

interface MessageCodeBlockProps {
    code: string;
    language: string;
    variant?: 'header' | 'floating' | 'inline';
}

export function MessageCodeBlock({
    code,
    language,
    variant = 'header'
}: MessageCodeBlockProps) {
    const styles = useStyles();

    if (variant === 'header') {
        return (
            <>
                <div className={styles.headerContainer}>
                    {/* Header with language and actions */}
                    <div className={styles.header}>
                        <span className={styles.languageLabel}>{language}</span>
                    </div>

                    {/* Code content with syntax highlighting */}
                    <div className="overflow-y-auto" dir="ltr">
                        <SyntaxHighlighter
                            language={language}
                            style={oneDark}
                            customStyle={{ margin: 0, padding: '1rem', background: 'rgba(0,0,0,0.05)', fontSize: '14px', lineHeight: '1.5' }}
                            showLineNumbers={true}
                            wrapLines={true}
                            codeTagProps={{
                                style: {
                                    background: 'transparent',
                                    backgroundColor: 'transparent'
                                }
                            }}
                        >
                            {code}
                        </SyntaxHighlighter>
                    </div>
                </div>
            </>
        );
    }

    if (variant === 'floating') {
        return (
            <div className={`${styles.floatingContainer} group`}>
                <div style={{ position: 'relative' }}>
                    <SyntaxHighlighter
                        language={language}
                        style={oneDark}
                        customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '14px', lineHeight: '1.5' }}
                        showLineNumbers={false}
                        wrapLines={true}
                        codeTagProps={{
                            style: {
                                background: 'transparent',
                                backgroundColor: 'transparent'
                            }
                        }}
                    >
                        {code}
                    </SyntaxHighlighter>

                </div>
            </div>
        );
    }

    // Default inline variant
    return (
        <>
            <div className={`${styles.inlineContainer} group`}>
                <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{ margin: 0, padding: '0.75rem', background: 'transparent', fontSize: '13px', lineHeight: '1.4' }}
                    showLineNumbers={false}
                    wrapLines={true}
                    codeTagProps={{
                        style: {
                            background: 'transparent',
                            backgroundColor: 'transparent'
                        }
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </>
    );
}