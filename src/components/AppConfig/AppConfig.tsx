import React, { ChangeEvent, FormEvent, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { css } from '@emotion/css';
import { AppPluginMeta, GrafanaTheme2, PluginConfigPageProps, PluginMeta } from '@grafana/data';
import { DataSourcePicker, getBackendSrv } from '@grafana/runtime';
import { Button, Field, FieldSet, Input, useStyles2 } from '@grafana/ui';
import { AppPluginSettings, DEFAULT_MAX_LINES, DEFAULT_TIME_RANGE_HOURS } from '../../types';
import { testIds } from '../testIds';

type State = {
  lokiDatasourceUid: string;
  tempoDatasourceUid: string;
  defaultTimeRangeHours: number;
  maxLines: number;
};

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<AppPluginSettings>> {}

const AppConfig = ({ plugin }: AppConfigProps) => {
  const s = useStyles2(getStyles);
  const { enabled, pinned, jsonData } = plugin.meta;
  const [state, setState] = useState<State>({
    lokiDatasourceUid: jsonData?.lokiDatasourceUid ?? '',
    tempoDatasourceUid: jsonData?.tempoDatasourceUid ?? '',
    defaultTimeRangeHours: jsonData?.defaultTimeRangeHours ?? DEFAULT_TIME_RANGE_HOURS,
    maxLines: jsonData?.maxLines ?? DEFAULT_MAX_LINES,
  });
  const isSubmitDisabled = !state.lokiDatasourceUid || state.defaultTimeRangeHours < 1 || state.maxLines < 100;

  const onNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      [event.target.name]: Number(event.target.value),
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    updatePluginAndReload(plugin.meta.id, {
      enabled,
      pinned,
      jsonData: {
        lokiDatasourceUid: state.lokiDatasourceUid,
        tempoDatasourceUid: state.tempoDatasourceUid || undefined,
        defaultTimeRangeHours: state.defaultTimeRangeHours,
        maxLines: state.maxLines,
      },
    });
  };

  return (
    <form onSubmit={onSubmit}>
      <FieldSet label="Session replay settings">
        <Field label="Loki data source" description="Data source containing Faro events" required>
          <div data-testid={testIds.appConfig.lokiDatasource}>
            <DataSourcePicker
              width={60}
              inputId="config-loki-datasource"
              type="loki"
              current={state.lokiDatasourceUid}
              placeholder="Select a Loki data source"
              noDefault
              onChange={({ uid }) => setState({ ...state, lokiDatasourceUid: uid })}
            />
          </div>
        </Field>

        <Field
          label="Tempo data source"
          description="Optional data source for related trace links"
          className={s.marginTop}
        >
          <div data-testid={testIds.appConfig.tempoDatasource}>
            <DataSourcePicker
              width={60}
              inputId="config-tempo-datasource"
              type="tempo"
              current={state.tempoDatasourceUid}
              placeholder="Select a Tempo data source"
              noDefault
              onClear={() => setState({ ...state, tempoDatasourceUid: '' })}
              onChange={({ uid }) => setState({ ...state, tempoDatasourceUid: uid })}
            />
          </div>
        </Field>

        <Field
          label="Default time range"
          description="Hours searched when the sessions page opens"
          className={s.marginTop}
        >
          <Input
            width={20}
            type="number"
            min={1}
            name="defaultTimeRangeHours"
            data-testid={testIds.appConfig.defaultTimeRangeHours}
            value={state.defaultTimeRangeHours}
            onChange={onNumberChange}
          />
        </Field>

        <Field
          label="Maximum lines per query"
          description="Loki query limit before time-window splitting"
          className={s.marginTop}
        >
          <Input
            width={20}
            type="number"
            min={100}
            name="maxLines"
            data-testid={testIds.appConfig.maxLines}
            value={state.maxLines}
            onChange={onNumberChange}
          />
        </Field>

        <div className={s.marginTop}>
          <Button type="submit" data-testid={testIds.appConfig.submit} disabled={isSubmitDisabled}>
            Save settings
          </Button>
        </div>
      </FieldSet>
    </form>
  );
};

export default AppConfig;

const getStyles = (theme: GrafanaTheme2) => ({
  colorWeak: css`
    color: ${theme.colors.text.secondary};
  `,
  marginTop: css`
    margin-top: ${theme.spacing(3)};
  `,
});

const updatePluginAndReload = async (pluginId: string, data: Partial<PluginMeta<AppPluginSettings>>) => {
  try {
    await updatePlugin(pluginId, data);

    // Reloading the page as the changes made here wouldn't be propagated to the actual plugin otherwise.
    // This is not ideal, however unfortunately currently there is no supported way for updating the plugin state.
    window.location.reload();
  } catch (e) {
    console.error('Error while updating the plugin', e);
  }
};

const updatePlugin = async (pluginId: string, data: Partial<PluginMeta<AppPluginSettings>>) => {
  const response = await getBackendSrv().fetch({
    url: `/api/plugins/${pluginId}/settings`,
    method: 'POST',
    data,
  });

  return lastValueFrom(response);
};
