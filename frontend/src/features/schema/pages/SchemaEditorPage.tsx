import { useParams } from 'react-router-dom';
import { SchemaEditorView } from '../components/SchemaEditorView';

export default function SchemaEditorPage() {
  const { templateId, versionId } = useParams<{ templateId: string; versionId: string }>();

  if (!templateId || !versionId) {
    return <div className="text-sm text-red-600">Missing template or version ID.</div>;
  }

  return (
    <SchemaEditorView
      templateId={templateId}
      versionId={versionId}
      backPath={`/templates/${templateId}`}
      backLabel="Back to template details"
    />
  );
}
