import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SessionTimeline from './SessionTimeline';
import type { SessionEvent } from '../../types';

const REPLAY_START = 1_700_000_000_000;

const events: SessionEvent[] = [
  { timestamp: REPLAY_START + 1_000, kind: 'log', message: 'Product added', raw: {} },
  {
    timestamp: REPLAY_START + 65_000,
    kind: 'event',
    name: 'demo.products.loaded',
    message: 'count=3',
    traceId: 'trace-1',
    raw: {},
  },
];

describe('Components/SessionTimeline', () => {
  test('orders events by replay offset and seeks when an offset is clicked', () => {
    const onSeek = jest.fn();
    render(<SessionTimeline events={events} replayStart={REPLAY_START} currentOffset={0} onSeek={onSeek} />);

    expect(screen.getByText('0:01')).toBeInTheDocument();
    fireEvent.click(screen.getByText('1:05'));

    expect(onSeek).toHaveBeenCalledWith(65_000);
  });

  test('links to Tempo only when a trace ID and a Tempo data source are available', () => {
    const { rerender } = render(
      <SessionTimeline events={events} replayStart={REPLAY_START} currentOffset={0} onSeek={jest.fn()} />
    );
    expect(screen.queryByRole('link', { name: /trace/i })).not.toBeInTheDocument();

    rerender(
      <SessionTimeline
        events={events}
        replayStart={REPLAY_START}
        currentOffset={0}
        tempoDatasourceUid="tempo-uid"
        onSeek={jest.fn()}
      />
    );

    const link = screen.getByRole('link', { name: /trace/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('/explore?schemaVersion=1&panes='));
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('"query":"trace-1","queryType":"traceql"');
  });

  test('renders an empty state when the session produced no events', () => {
    render(<SessionTimeline events={[]} replayStart={REPLAY_START} currentOffset={0} onSeek={jest.fn()} />);

    expect(screen.getByText(/no logs, exceptions or events were recorded/i)).toBeInTheDocument();
  });
});
