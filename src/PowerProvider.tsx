import { useEffect, useRef, type ReactNode } from 'react';
import { initialize, type IInitializeOptions } from '@microsoft/power-apps/app';

export default function PowerProvider({ children }: { children: ReactNode }) {
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      try {
        const options: IInitializeOptions = {};
        await initialize(options);
        console.log('Power Platform SDK initialized');
      } catch (error) {
        console.error('Failed to initialize Power Platform SDK', error);
      }
    })();
  }, []);

  return <>{children}</>;
}