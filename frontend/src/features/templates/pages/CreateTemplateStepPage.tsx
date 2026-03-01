import { useParams } from 'react-router-dom';

export default function CreateTemplateStepPage() {
  const { templateId } = useParams<{ templateId: string }>();
  return <div>Create Template – Step 1{templateId ? ` (${templateId})` : ''}</div>;
}
