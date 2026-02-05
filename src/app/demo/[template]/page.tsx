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

  const scriptUrl = clientId ? `/widgets/${clientId}/script.js` : '';

  // Special handling for client-website template
  if (template === 'client-website') {
    if (!websiteUrl) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Website URL Required</h1>
            <p className="text-gray-400">No website URL was provided for preview.</p>
          </div>
        </div>
      );
    }
    return <ClientWebsiteTemplate scriptUrl={scriptUrl} websiteUrl={websiteUrl} />;
  }

  const templates: Record<string, React.ComponentType<{ scriptUrl: string }>> = {
    dental: DentalTemplate,
    construction: ConstructionTemplate,
    hotel: HotelTemplate,
  };

  const TemplateComponent = templates[template];

  if (!TemplateComponent) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Template Not Found</h1>
          <p className="text-gray-400">The requested template does not exist.</p>
        </div>
      </div>
    );
  }

  return <TemplateComponent scriptUrl={scriptUrl} />;
}

export default function DemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DemoContent />
    </Suspense>
  );
}
