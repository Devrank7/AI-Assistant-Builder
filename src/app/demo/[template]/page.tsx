'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import DentalTemplate from '@/components/templates/DentalTemplate';
import ConstructionTemplate from '@/components/templates/ConstructionTemplate';
import HotelTemplate from '@/components/templates/HotelTemplate';
import ClientWebsiteTemplate from '@/components/templates/ClientWebsiteTemplate';

function DemoContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const template = params.template as string;
  const clientId = searchParams.get('client') || '';
  const websiteUrl = searchParams.get('website') || '';
  const widgetType = searchParams.get('type') || '';

  // Default to /quickwidgets/ (demo widgets) — only use /widgets/ when explicitly set to "production"
  const widgetDir = widgetType === 'production' ? 'widgets' : 'quickwidgets';
  const scriptUrl = clientId ? `/${widgetDir}/${clientId}/script.js` : '';

  // Special handling for client-website template
  if (template === 'client-website') {
    if (!websiteUrl) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-white">Website URL Required</h1>
            <p className="text-gray-400">No website URL was provided for preview.</p>
          </div>
        </div>
      );
    }
    return <ClientWebsiteTemplate key={clientId} scriptUrl={scriptUrl} websiteUrl={websiteUrl} />;
  }

  const templates: Record<string, React.ComponentType<{ scriptUrl: string }>> = {
    dental: DentalTemplate,
    construction: ConstructionTemplate,
    hotel: HotelTemplate,
  };

  const TemplateComponent = templates[template];

  if (!TemplateComponent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-white">Template Not Found</h1>
          <p className="text-gray-400">The requested template does not exist.</p>
        </div>
      </div>
    );
  }

  return <TemplateComponent key={clientId} scriptUrl={scriptUrl} />;
}

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
        </div>
      }
    >
      <DemoContent />
    </Suspense>
  );
}
