'use client';

// SGP Navigation IA — top-nav information-architecture exploration.
// Ported from the Radix Prototypes (Vite) app to ScaleUI3 (Next.js App Router).
// Tweakpane controls drive the app-picker placement and icon/description density.

import { useTweakpane } from '@proto/devtools/react';
import { NavV3, ShowIconsContext, ShowDescriptionsContext } from '@/components/sgp-nav/sgp-nav';

export default function SgpNavPage() {
  const { params } = useTweakpane(
    {
      appPicker: 'grid-icon',
      showIcons: true,
      showDescriptions: true,
    },
    {
      appPicker: {
        label: 'App picker',
        options: { 'Grid icon': 'grid-icon', 'In Branding': 'branding' },
      },
      showIcons: { label: 'Show icons' },
      showDescriptions: { label: 'Show descriptions' },
    },
  );

  return (
    <ShowIconsContext.Provider value={params.showIcons as boolean}>
      <ShowDescriptionsContext.Provider value={params.showDescriptions as boolean}>
        <div className="min-h-screen bg-gray-2 flex flex-col">
          <div className="shadow-sm">
            <NavV3 appPickerInBranding={params.appPicker === 'branding'} />
          </div>
        </div>
      </ShowDescriptionsContext.Provider>
    </ShowIconsContext.Provider>
  );
}
