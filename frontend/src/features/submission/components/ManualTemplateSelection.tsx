import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/Select';
import type { TemplateSummary } from '@/features/templates/types';

interface ManualTemplateSelectionProps {
  templates: TemplateSummary[];
  value: string;
  onChange: (templateId: string) => void;
}

export function ManualTemplateSelection({ templates, value, onChange }: ManualTemplateSelectionProps) {
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

        {selectedTemplate != null && (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium text-foreground">{selectedTemplate.name}</p>
            <p className="mt-1 text-muted-foreground">
              Latest version that would be used: v
              {selectedTemplate.latestVersion?.versionNumber ?? 'Not available'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
