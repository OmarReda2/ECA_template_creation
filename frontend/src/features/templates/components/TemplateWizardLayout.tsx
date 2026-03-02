import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/shared/ui/stepper';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { cn } from '@/shared/lib/utils';

const START_OVER_MESSAGE =
  "You can't edit Template Name or Sector Code after creation. Going back will start a new template and your current template will remain as-is.";

const WIZARD_STEPS = [
  { value: 'details', title: 'Details' },
  { value: 'schema', title: 'Schema' },
  { value: 'export', title: 'Export' },
] as const;

function getActiveStep(pathname: string): string {
  if (pathname === '/templates/create') return 'details';
  if (/^\/templates\/create\/[^/]+\/export$/.test(pathname)) return 'export';
  if (/^\/templates\/create\/[^/]+$/.test(pathname)) return 'schema';
  return 'details';
}

interface TemplateWizardLayoutProps {
  title: string;
  description?: ReactNode;
  rightActions?: ReactNode;
  children: ReactNode;
  /** Bottom action bar. Renders below content. */
  bottomActions?: ReactNode;
  className?: string;
}

export function TemplateWizardLayout({
  title,
  description,
  rightActions,
  children,
  bottomActions,
  className,
}: TemplateWizardLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const activeStep = getActiveStep(pathname);
  const hasTemplateId = Boolean(templateId);
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);

  const needsStartOverConfirm = hasTemplateId && (activeStep === 'schema' || activeStep === 'export');

  const handleStep1Click = (e: React.MouseEvent) => {
    if (needsStartOverConfirm) {
      e.preventDefault();
      setShowStartOverConfirm(true);
    }
  };

  const handleStartOverConfirm = () => {
    setShowStartOverConfirm(false);
    navigate('/templates/create');
  };

  return (
    <div className={cn('mx-auto max-w-4xl space-y-6', className)}>
      <Stepper value={activeStep}>
        <StepperList className="w-full">
          <StepperItem
            value="details"
            completed={activeStep !== 'details'}
            disabled={false}
          >
            <StepperTrigger asChild>
              <Link to="/templates/create" onClick={handleStep1Click}>
                <StepperIndicator />
                <StepperTitle>{WIZARD_STEPS[0].title}</StepperTitle>
              </Link>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>

          <StepperItem
            value="schema"
            completed={activeStep === 'export'}
            disabled={!hasTemplateId}
          >
            {hasTemplateId ? (
              <StepperTrigger asChild>
                <Link to={`/templates/create/${templateId}`}>
                  <StepperIndicator />
                  <StepperTitle>{WIZARD_STEPS[1].title}</StepperTitle>
                </Link>
              </StepperTrigger>
            ) : (
              <StepperTrigger disabled>
                <StepperIndicator />
                <StepperTitle>{WIZARD_STEPS[1].title}</StepperTitle>
              </StepperTrigger>
            )}
            <StepperSeparator />
          </StepperItem>

          <StepperItem
            value="export"
            completed={false}
            disabled={!hasTemplateId}
          >
            {hasTemplateId ? (
              <StepperTrigger asChild>
                <Link to={`/templates/create/${templateId}/export`}>
                  <StepperIndicator />
                  <StepperTitle>{WIZARD_STEPS[2].title}</StepperTitle>
                </Link>
              </StepperTrigger>
            ) : (
              <StepperTrigger disabled>
                <StepperIndicator />
                <StepperTitle>{WIZARD_STEPS[2].title}</StepperTitle>
              </StepperTrigger>
            )}
            <StepperSeparator />
          </StepperItem>
        </StepperList>
      </Stepper>

      <PageHeader
        title={title}
        description={description}
        rightActions={rightActions}
      />

      <div>{children}</div>

      {bottomActions != null && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
          {bottomActions}
        </div>
      )}

      <Modal
        open={showStartOverConfirm}
        onClose={() => setShowStartOverConfirm(false)}
        title="Start over?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{START_OVER_MESSAGE}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowStartOverConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleStartOverConfirm}>
              Start over
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
