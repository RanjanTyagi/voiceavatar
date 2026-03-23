'use client';

import dynamic from 'next/dynamic';

const AvatarChat = dynamic(
  () => import('@/components/AvatarChat').then((mod) => ({ default: mod.AvatarChat })),
  { ssr: false }
);

const AccessibilityControls = dynamic(
  () => import('@/components/AccessibilityControls').then((mod) => ({ default: mod.AccessibilityControls })),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="relative h-screen overflow-hidden">
      <AccessibilityControls />
      <AvatarChat useCase="support" enableFallbackTTS={false} />
    </div>
  );
}
