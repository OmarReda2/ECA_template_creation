import { ErrorPanel } from '@/shared/errors/ErrorPanel';
import { getErrorMessage, type FrontendError } from '@/shared/errors/errorTypes';
import type { TemplateSummary } from '@/features/templates/types';
import type { SubmissionIdentifyResponse } from '../types';
import { UploadIdentifyStep } from './UploadIdentifyStep';
import { IdentityResultCard } from './IdentityResultCard';
import { ManualTemplateSelection } from './ManualTemplateSelection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';

interface SubmissionStepOneViewProps {
  uploadKey: number;
  identifyResult: SubmissionIdentifyResponse | null;
  identifyError: FrontendError | null;
  templates: TemplateSummary[];
  selectedTemplateId: string;
  shouldShowFallback: boolean;
  onIdentified: (file: File, result: SubmissionIdentifyResponse) => void;
  onIdentifyError: (error: FrontendError | null) => void;
  onSelectTemplate: (templateId: string) => void;
}

export function SubmissionStepOneView({
  uploadKey,
  identifyResult,
  identifyError,
  templates,
  selectedTemplateId,
  shouldShowFallback,
  onIdentified,
  onIdentifyError,
  onSelectTemplate,
}: SubmissionStepOneViewProps) {
  const selectedTemplate = templates.find((template) => template.templateId === selectedTemplateId) ?? null;

  return (
    <div className="space-y-6">
      <UploadIdentifyStep
        key={uploadKey}
        onIdentified={onIdentified}
        onError={onIdentifyError}
      />

      {identifyError != null && (
        <ErrorPanel error={getErrorMessage(identifyError, true)} onDismiss={() => onIdentifyError(null)} />
      )}

      {identifyResult != null && <IdentityResultCard result={identifyResult} />}

      {shouldShowFallback && (
        <ManualTemplateSelection
          templates={templates}
          value={selectedTemplateId}
          onChange={onSelectTemplate}
        />
      )}

      {selectedTemplate != null && (
        <Card>
          <CardHeader>
            <CardTitle>Fallback selection summary</CardTitle>
            <CardDescription>
              This selection is manual fallback only and is not treated as auto-identification. Step 2 will validate against the latest version of the selected template.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {selectedTemplate.name} is ready for manual fallback validation using latest version v
            {selectedTemplate.latestVersion?.versionNumber ?? 'Not available'}.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
