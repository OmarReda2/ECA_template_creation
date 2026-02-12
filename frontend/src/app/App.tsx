import { ToastProvider } from '@/shared/ui/Toast';
import { AppRouter } from './router';

function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}

export default App;
