import { ErrorPanel } from '@/shared/errors/ErrorPanel';
import { getErrorMessage, type FrontendError } from '@/shared/errors/errorTypes';
import type { TemplateSummary } from '@/features/templates/types';
import type { SubmissionIdentifyResponse } from '../types';
import { UploadIdentifyStep } from './UploadIdentifyStep';
import { IdentityResultCard } from './IdentityResultCard';
import { ManualTemplateSelection } from './ManualTemplateSelection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';

interface SubmissionStepOneViewProps {
  uploadKey: number;
  identifyResult: SubmissionIdentifyResponse | null;
  identifyError: FrontendError | null;
  templates: TemplateSummary[];
  selectedTemplateId: string;
  selectedTemplateSummary: TemplateSummary | null;
  shouldShowFallback: boolean;
  identifying: boolean;
  canContinue: boolean;
  onIdentifyStart: (file: File) => void;
  onIdentified: (file: File, result: SubmissionIdentifyResponse) => void;
  onIdentifyError: (error: FrontendError | null) => void;
  onSelectTemplate: (templateId: string) => void;
  onContinue: () => void;
}

export function SubmissionStepOneView({
  uploadKey,
  identifyResult,
  identifyError,
  templates,
  selectedTemplateId,
  selectedTemplateSummary,
  shouldShowFallback,
  identifying,
  canContinue,
  onIdentifyStart,
  onIdentified,
  onIdentifyError,
  onSelectTemplate,
  onContinue,
}: SubmissionStepOneViewProps) {
  return (
    <div className="space-y-6">
      <UploadIdentifyStep
        key={uploadKey}
        onIdentifyStart={onIdentifyStart}
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

      {selectedTemplateSummary != null && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Fallback selection summary</CardTitle>
                <CardDescription>
                  This selection is manual fallback only and is not treated as auto-identification. Step 2 will validate against the latest version of the selected template.
                </CardDescription>
              </div>
              <Badge variant="warning">Manual fallback</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">{selectedTemplateSummary.name}</p>
              <p className="mt-1">
                Manual fallback is ready. Step 2 will validate against latest version v
                {selectedTemplateSummary.latestVersion?.versionNumber ?? 'Not available'}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={onContinue} disabled={!canContinue || identifying}>
          Continue to Validation
        </Button>
      </div>
    </div>
  );
}
