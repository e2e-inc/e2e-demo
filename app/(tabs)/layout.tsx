import type { ReactNode } from 'react';

import { TabBar } from '../../components/tab-bar';

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <TabBar />
    </>
  );
}
