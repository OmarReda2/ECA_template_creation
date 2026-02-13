import { TooltipProvider } from '@/shared/ui/Tooltip';
import { ToastProvider } from '@/shared/ui/Toast';
import { AppRouter } from './router';

function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </TooltipProvider>
  );
}

export default App;
