import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FolderKanban,
  ScanSearch,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Separator } from '@/shared/ui/separator';

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (element == null) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SurfaceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/85 px-4 py-3 shadow-sm backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        ticking = false;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const heroOffset = useMemo(() => Math.min(scrollY * 0.08, 20), [scrollY]);
  const layerOffset = useMemo(() => Math.min(scrollY * 0.05, 14), [scrollY]);

  const workflowSteps = [
    {
      number: '01',
      title: 'Create Template',
      description: 'Define a governed workbook structure with explicit schema ownership and controlled versioning.',
      icon: FolderKanban,
    },
    {
      number: '02',
      title: 'Export Workbook',
      description: 'Generate versioned Excel workbooks with embedded metadata that preserves traceable identity.',
      icon: FileSpreadsheet,
    },
    {
      number: '03',
      title: 'Identify & Validate',
      description: 'Resolve workbook identity, apply schema-aware checks, and route fallback validation when required.',
      icon: ScanSearch,
    },
    {
      number: '04',
      title: 'Save Submission',
      description: 'Persist a lightweight validated submission record for downstream review and audit visibility.',
      icon: ShieldCheck,
    },
  ] as const;

  const capabilityCards = [
    {
      title: 'Version-aware validation',
      description: 'Validation targets the correct template version and schema hash instead of relying on informal workbook naming.',
    },
    {
      title: 'Metadata-driven identification',
      description: 'Workbook metadata is treated as a first-class identity signal, with manual fallback controlled and explicit.',
    },
    {
      title: 'Submission traceability',
      description: 'Validated submissions are recorded with template, version, schema hash, and timestamp for read-only audit visibility.',
    },
    {
      title: 'Structured process control',
      description: 'The product guides users through a deterministic template, validation, and submission lifecycle.',
    },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,252,0.94))] px-6 py-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] sm:px-8 lg:px-12 lg:py-12">
        <div
          className="pointer-events-none absolute inset-x-8 top-8 hidden h-48 rounded-[1.75rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.06),rgba(59,130,246,0.04))] shadow-[0_30px_80px_-50px_rgba(15,23,42,0.32)] lg:block"
          style={{ transform: `translate3d(0, ${heroOffset}px, 0)` }}
        />
        <div
          className="pointer-events-none absolute right-12 top-16 hidden h-56 w-72 rounded-[1.5rem] border border-border/60 bg-background/70 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm lg:block"
          style={{ transform: `translate3d(0, ${layerOffset}px, 0)` }}
        >
          <div className="grid h-full grid-cols-[1.2fr_0.8fr] gap-3 p-5">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Validation Matrix</div>
              <div className="mt-4 space-y-3">
                <div className="h-3 rounded-full bg-foreground/10" />
                <div className="h-3 w-10/12 rounded-full bg-foreground/10" />
                <div className="h-3 w-8/12 rounded-full bg-primary/20" />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex-1 rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Version State</div>
                <div className="mt-4 h-20 rounded-lg bg-foreground/5" />
              </div>
              <div className="rounded-xl border border-border/70 bg-primary/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Submission Trace</div>
                <div className="mt-3 h-8 rounded-lg bg-primary/15" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <Reveal className="space-y-8">
            <div className="space-y-5">
              <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary">
                Governance Workflow Platform
              </Badge>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Structured workbook governance for versioned templates and controlled submissions.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Design governed Excel templates, export traceable workbooks, and validate incoming submissions against the correct schema with clear operational visibility.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Link
                to="/templates"
                className="group rounded-2xl border border-border/70 bg-background/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Template Creation &amp; Export</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Create template versions, manage schema structure, and export controlled workbooks ready for distribution.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>

              <Link
                to="/submissions"
                className="group rounded-2xl border border-border/70 bg-background/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Data Submission</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Upload exported workbooks, identify template origin, validate against the active schema, and save traceable submissions.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120} className="grid gap-4">
            <SurfaceStat label="Validation Model" value="Metadata-led, version-aware" />
            <SurfaceStat label="Submission Record" value="Traceable, minimal persistence" />
            <SurfaceStat label="Process Discipline" value="Template to submission control" />
          </Reveal>
        </div>
      </section>

      <section className="space-y-8">
        <Reveal>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge variant="neutral" className="w-fit">Process Overview</Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                A controlled operational path from template design to validated submission.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Each stage is designed to preserve version intent, validation accuracy, and traceable submission handling without obscuring responsibility.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-4 xl:grid-cols-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.number} delay={index * 90}>
                <Card className="group h-full border-border/70 bg-background/95 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                        {step.number}
                      </Badge>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-muted/35 text-foreground">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-6">
                        {step.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <Reveal className="space-y-6">
          <div className="space-y-2">
            <Badge variant="neutral" className="w-fit">Capabilities</Badge>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Built for controlled validation, version discipline, and operational trust.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {capabilityCards.map((item, index) => (
              <Reveal key={item.title} delay={index * 70}>
                <Card className="h-full border-border/70 bg-muted/15 shadow-sm transition-all duration-200 hover:border-primary/20 hover:bg-muted/25">
                  <CardHeader className="space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-6">
                        {item.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <Card className="overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.96))] shadow-[0_24px_70px_-42px_rgba(15,23,42,0.32)]">
            <CardHeader className="space-y-4">
              <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary">
                Operational Readiness
              </Badge>
              <div>
                <CardTitle className="text-xl">One platform for governed template design and controlled intake.</CardTitle>
                <CardDescription className="mt-3 max-w-xl text-sm leading-6">
                  The landing experience directs users into the correct flow quickly while reinforcing that template structure, workbook identity, and validated submission records are part of one controlled process.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Primary Route</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">Template design and workbook export</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Operational Route</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">Submission identification and validation</div>
                  </div>
                </div>
                <Separator className="my-5" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <SurfaceStat label="Identity Source" value="Embedded metadata" />
                  <SurfaceStat label="Validation Target" value="Resolved template version" />
                  <SurfaceStat label="Audit Signal" value="Saved submission record" />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/templates">Open Template Flow</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/submissions">Open Submission Flow</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
