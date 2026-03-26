import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import type { TemplateSummary } from '@/features/templates/types';

interface ManualTemplateSelectionProps {
  templates: TemplateSummary[];
  value: string;
  onChange: (templateId: string) => void;
  onValidate: () => void;
  validating?: boolean;
  disabled?: boolean;
}

export function ManualTemplateSelection({
  templates,
  value,
  onChange,
  onValidate,
  validating = false,
  disabled = false,
}: ManualTemplateSelectionProps) {
  const selectedTemplate = templates.find((template) => template.templateId === value) ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual fallback</CardTitle>
        <CardDescription>
          Metadata could not be resolved. Select a template manually. This does not count as auto-identification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            No templates are currently available for manual fallback.
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Template</label>
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.templateId} value={template.templateId}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedTemplate != null && (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium text-foreground">{selectedTemplate.name}</p>
            <p className="mt-1 text-muted-foreground">
              Latest version that would be used: v
              {selectedTemplate.latestVersion?.versionNumber ?? 'Not available'}
            </p>
            <p className="mt-1 text-muted-foreground">
              This continues validation using the selected template&apos;s latest version as a manual fallback.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onValidate}
            disabled={disabled || validating || selectedTemplate == null}
          >
            {validating ? (
              <>
                <Spinner className="h-4 w-4" />
                Validating...
              </>
            ) : (
              'Validate with Selected Template'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
