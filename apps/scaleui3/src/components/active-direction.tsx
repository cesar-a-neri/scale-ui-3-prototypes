'use client';

import * as React from 'react';
import { DirectionProvider } from '@base-ui/react/direction-provider';

type Direction = 'ltr' | 'rtl';

interface ActiveDirectionContextValue {
  direction: Direction;
  setDirection: (direction: Direction) => void;
}

const ActiveDirectionContext = React.createContext<ActiveDirectionContextValue | null>(null);

export function ActiveDirectionProvider({ children }: { children: React.ReactNode }) {
  const [direction, setDirection] = React.useState<Direction>('ltr');

  React.useEffect(() => {
    document.documentElement.setAttribute('dir', direction);
  }, [direction]);

  return (
    <ActiveDirectionContext.Provider value={{ direction, setDirection }}>
      <DirectionProvider direction={direction}>{children}</DirectionProvider>
    </ActiveDirectionContext.Provider>
  );
}

export function useActiveDirection() {
  const context = React.useContext(ActiveDirectionContext);
  if (!context) {
    throw new Error('useActiveDirection must be used within an ActiveDirectionProvider');
  }
  return context;
}

export type { Direction };
