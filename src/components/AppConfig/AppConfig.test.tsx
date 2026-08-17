import React from 'react';
import { render, screen } from '@testing-library/react';
import { PluginType } from '@grafana/data';
import AppConfig, { AppConfigProps } from './AppConfig';
import { testIds } from 'components/testIds';
import { DEFAULT_MAX_LINES, DEFAULT_TIME_RANGE_HOURS } from '../../types';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  DataSourcePicker: () => null,
}));

describe('Components/AppConfig', () => {
  let props: AppConfigProps;

  beforeEach(() => {
    jest.resetAllMocks();

    props = {
      plugin: {
        meta: {
          id: 'sample-app',
          name: 'Sample App',
          type: PluginType.app,
          enabled: true,
          jsonData: {},
        },
      },
      query: {},
    } as unknown as AppConfigProps;
  });

  test('renders data source and query settings', () => {
    const plugin = { meta: { ...props.plugin.meta, enabled: false } };

    // @ts-ignore - We don't need to provide `addConfigPage()` and `setChannelSupport()` for these tests
    render(<AppConfig plugin={plugin} query={props.query} />);

    expect(screen.queryByRole('group', { name: /session replay settings/i })).toBeInTheDocument();
    expect(screen.queryByTestId(testIds.appConfig.lokiDatasource)).toBeInTheDocument();
    expect(screen.queryByTestId(testIds.appConfig.tempoDatasource)).toBeInTheDocument();
    expect(screen.queryByTestId(testIds.appConfig.defaultTimeRangeHours)).toHaveValue(DEFAULT_TIME_RANGE_HOURS);
    expect(screen.queryByTestId(testIds.appConfig.maxLines)).toHaveValue(DEFAULT_MAX_LINES);
    expect(screen.queryByRole('button', { name: /save settings/i })).toBeDisabled();
  });
});
