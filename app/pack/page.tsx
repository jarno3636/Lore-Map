import type { Metadata } from 'next';
import TobyworldTravelersPack from '@/components/tobyworld/TobyworldTravelersPack';
import TravelerEventBeacon from '@/components/tobyworld/TravelerEventBeacon';

export const metadata: Metadata = {
  title: `Traveler's Pack | Tobyworld Atlas`,
  description:
    'A field collection of embroidered memories earned across Tobyworld.',
  openGraph: {
    title: `Tobyworld Traveler's Pack`,
    description:
      'Every explorer carries a different story.',
    images: ['/images/tobyworld/travelers-pack-share.png'],
  },
};

export default function TravelersPackPage() {
  return (
    <>
      <TravelerEventBeacon pageKey="pack" enableSessionTracking />
      <TobyworldTravelersPack />
    </>
  );
}
