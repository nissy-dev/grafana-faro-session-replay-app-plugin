import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { LoadingPlaceholder } from '@grafana/ui';
import { ROUTES } from '../../constants';
import type { AppPluginSettings } from '../../types';

const SessionsPage = React.lazy(() => import('../../pages/SessionsPage'));
const SessionDetailPage = React.lazy(() => import('../../pages/SessionDetailPage'));

function App(props: AppRootProps<AppPluginSettings>) {
  const settings = props.meta.jsonData ?? {};

  return (
    <Suspense fallback={<LoadingPlaceholder text="" />}>
      <Routes>
        <Route path={`${ROUTES.Sessions}/:sessionId`} element={<SessionDetailPage settings={settings} />} />
        <Route path="*" element={<SessionsPage settings={settings} />} />
      </Routes>
    </Suspense>
  );
}

export default App;
