// src/App.tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ChatContainer } from './components/ChatContainer';

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <ChatContainer />
    </FluentProvider>
  );
}

export default App;
