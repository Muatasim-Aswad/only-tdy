import { useGuidancePage } from './guidance/events.ts';
import { GuidanceControls } from './guidance/GuidanceControls.tsx';
import { GuideScreen } from './components/GuideScreen.tsx';

export function GuidePage() {
  useGuidancePage({ kind: 'guide', populated: false });
  return <GuideScreen guidance={<GuidanceControls />} />;
}
