import { Route, Routes } from 'react-router-dom';
import AppShell from './layout/AppShell';
import TemplatesListPage from '../features/templates/pages/TemplatesListPage';
import TemplateDetailsPage from '../features/templates/pages/TemplateDetailsPage';
import SchemaEditorPage from '../features/schema/pages/SchemaEditorPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<TemplatesListPage />} />
        <Route path="templates" element={<TemplatesListPage />} />
        <Route path="templates/:templateId" element={<TemplateDetailsPage />} />
        <Route path="templates/:templateId/versions/:versionId/schema" element={<SchemaEditorPage />} />
      </Route>
    </Routes>
  );
}
