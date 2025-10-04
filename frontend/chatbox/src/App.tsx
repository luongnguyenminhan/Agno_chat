// src/App.tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ChatContainer } from './components/ChatContainer';
import { UserProvider } from './contexts/UserContext';

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <UserProvider>
        <ChatContainer isEmbedded={false} />
      </UserProvider>
    </FluentProvider>
  );
}

export default App;
