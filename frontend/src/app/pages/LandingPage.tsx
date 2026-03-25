import { Link } from 'react-router-dom';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Choose a workflow</h1>
        <p className="text-sm text-muted-foreground">
          Select whether you want to create an Excel template or upload a workbook for submission.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <CardTitle>Template Creation &amp; Export</CardTitle>
            <CardDescription>Create and manage templates, versions, and Excel exports.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/templates">Create Template</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <CardTitle>Data Submission</CardTitle>
            <CardDescription>Upload a workbook and identify the template metadata it was built from.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/submissions">Submit Data</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
