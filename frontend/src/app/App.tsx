import { Toaster } from 'sonner';
import { TooltipProvider } from '@/shared/ui/Tooltip';
import { AppRouter } from './router';

function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <AppRouter />
      <Toaster richColors position="bottom-right" closeButton />
    </TooltipProvider>
  );
}

export default App;
