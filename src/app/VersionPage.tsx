import { useCallback, useEffect, useState } from 'react';

import { VersionScreen, type DeployedState } from './VersionScreen.tsx';

import { RUNNING_BUILD } from '../infra/build-info.ts';
import { fetchDeployedBuild, reloadToLatest } from '../infra/deployed-build.ts';

/** About: checks the deployed build and reloads onto it on request. */
export function VersionPage() {
  const [deployed, setDeployed] = useState<DeployedState>({ kind: 'checking' });

  useEffect(() => {
    let current = true;
    void fetchDeployedBuild().then((build) => {
      if (current)
        setDeployed(
          build === null ? { kind: 'unknown' } : { kind: 'known', build },
        );
    });
    return () => {
      current = false;
    };
  }, []);

  const handleReload = useCallback(() => {
    void reloadToLatest();
  }, []);

  return (
    <VersionScreen
      running={RUNNING_BUILD}
      deployed={deployed}
      onReload={handleReload}
    />
  );
}
