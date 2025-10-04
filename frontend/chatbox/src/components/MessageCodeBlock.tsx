import { Button } from '@fluentui/react-components';
import { ArrowDownload24Regular, Checkmark24Regular, Copy24Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { makeStyles, tokens } from '@fluentui/react-components';

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
  const [copied, setCopied] = useState(false);
  const styles = useStyles();

  // Map common language names to file extensions
  const getFileExtension = (lang: string): string => {
    const extensionMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      'c++': 'cpp',
      c: 'c',
      csharp: 'cs',
      'c#': 'cs',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      swift: 'swift',
      kotlin: 'kt',
      scala: 'scala',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      json: 'json',
      xml: 'xml',
      yaml: 'yml',
      yml: 'yml',
      markdown: 'md',
      sql: 'sql',
      bash: 'sh',
      shell: 'sh',
      powershell: 'ps1',
      dockerfile: 'dockerfile',
      tsx: 'tsx',
      jsx: 'jsx'
    };
    return extensionMap[lang.toLowerCase()] || 'txt';
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code block:', err);
    }
  };

  const handleDownload = () => {
    try {
      const extension = getFileExtension(language);
      const fileName = `code.${extension}`;
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download code:', err);
    }
  };

  if (variant === 'header') {
    return (
      <>
        <div className={styles.headerContainer}>
          {/* Header with language and actions */}
          <div className={styles.header}>
            <span className={styles.languageLabel}>{language}</span>
            <div className={styles.headerActions}>
              <Button
                appearance="subtle"
                size="small"
                onClick={handleDownload}
                className={styles.actionButton}
              >
                <ArrowDownload24Regular style={{ width: '12px', height: '12px' }} />
                Download
              </Button>
              <Button
                appearance="subtle"
                size="small"
                onClick={handleCopy}
                className={styles.actionButton}
              >
                {copied ? (
                  <>
                    <Checkmark24Regular style={{ width: '12px', height: '12px' }} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy24Regular style={{ width: '12px', height: '12px' }} />
                    Copy
                  </>
                )}
              </Button>
            </div>
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

          {/* Floating action buttons */}
          <div className={styles.floatingActions}>
            <Button
              appearance="subtle"
              size="small"
              onClick={handleDownload}
              className={styles.actionButtonFloating}
            >
              <ArrowDownload24Regular style={{ width: '12px', height: '12px' }} />
            </Button>
            <Button
              appearance="subtle"
              size="small"
              onClick={handleCopy}
              className={styles.actionButtonFloating}
            >
              {copied ? (
                <>
                  <Checkmark24Regular style={{ width: '12px', height: '12px' }} />
                  Copied
                </>
              ) : (
                <>
                  <Copy24Regular style={{ width: '12px', height: '12px' }} />
                  Copy
                </>
              )}
            </Button>
          </div>
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

        {/* Action buttons for inline variant */}
        <div className={styles.inlineActions}>
          <Button
            appearance="subtle"
            size="small"
            onClick={handleDownload}
            className={styles.actionButton}
          >
            <ArrowDownload24Regular style={{ width: '12px', height: '12px' }} />
          </Button>
          <Button
            appearance="subtle"
            size="small"
            onClick={handleCopy}
            className={styles.actionButton}
          >
            {copied ? (
              <Checkmark24Regular style={{ width: '12px', height: '12px' }} />
            ) : (
              <Copy24Regular style={{ width: '12px', height: '12px' }} />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}