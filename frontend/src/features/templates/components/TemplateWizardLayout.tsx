import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/shared/ui/stepper';
import { PageHeader } from '@/shared/ui/PageHeader';
import { cn } from '@/shared/lib/utils';

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
  className?: string;
}

export function TemplateWizardLayout({
  title,
  description,
  rightActions,
  children,
  className,
}: TemplateWizardLayoutProps) {
  const { pathname } = useLocation();
  const { templateId } = useParams<{ templateId: string }>();
  const activeStep = getActiveStep(pathname);
  const hasTemplateId = Boolean(templateId);

  return (
    <div className={cn('mx-auto max-w-4xl space-y-6', className)}>
      <PageHeader
        title={title}
        description={description}
        rightActions={rightActions}
      />

      <Stepper value={activeStep}>
        <StepperList className="w-full">
          <StepperItem
            value="details"
            completed={activeStep !== 'details'}
            disabled={false}
          >
            <StepperTrigger asChild>
              <Link to="/templates/create">
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

      <div>{children}</div>
    </div>
  );
}
