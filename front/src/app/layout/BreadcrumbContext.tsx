import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';

export interface BreadcrumbContextValue {
  templateName: string | null;
  versionNumber: number | null;
  setBreadcrumb: (payload: {
    templateName?: string | null;
    versionNumber?: number | null;
  }) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function useBreadcrumb() {
  const ctx = useContext(BreadcrumbContext);
  return ctx;
}

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState<number | null>(null);

  const setBreadcrumb = useCallback(
    (payload: { templateName?: string | null; versionNumber?: number | null }) => {
      if ('templateName' in payload) setTemplateName(payload.templateName ?? null);
      if ('versionNumber' in payload) setVersionNumber(payload.versionNumber ?? null);
    },
    []
  );

  const value: BreadcrumbContextValue = {
    templateName,
    versionNumber,
    setBreadcrumb,
  };

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}
