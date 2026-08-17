import { Replayer } from '@grafana/rrweb';
import { replayEvents } from '../../test/fixtures/replayEvents';

describe('Grafana rrweb compatibility', () => {
  test('constructs and destroys a replay produced with Grafana rrweb event types', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const replayer = new Replayer(replayEvents, { root });

    expect(replayer.getMetaData()).toEqual({
      startTime: replayEvents[0].timestamp,
      endTime: replayEvents[1].timestamp,
      totalTime: 10,
    });
    expect(root.querySelector('iframe')).toBeInTheDocument();

    replayer.destroy();
    root.remove();
  });
});
