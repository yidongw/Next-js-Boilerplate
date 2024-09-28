'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

import { useWindowSize } from '@/hooks/useWindowSize';

export const DemoBanner = () => {
  const { isTablet } = useWindowSize();
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-gray-900 p-4 text-lg font-semibold text-gray-100 [&_a:hover]:text-indigo-500 [&_a]:text-fuchsia-500">
      <div className="flex grow items-center justify-center space-x-2">
        <span>Live Demo of Next.js Boilerplate - </span>
        {!isTablet && <Link href="/sign-up">Explore the Authentication</Link>}
      </div>
      <ConnectButton accountStatus="address" chainStatus="none" showBalance={false} />
    </div>
  );
};
