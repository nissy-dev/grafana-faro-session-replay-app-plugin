import { EventType, type eventWithTime } from '@grafana/rrweb-types';

export const replayEvents = [
  {
    type: EventType.Meta,
    timestamp: 1_700_000_000_000,
    data: {
      href: 'https://example.com/orders',
      width: 1280,
      height: 720,
    },
  },
  {
    type: EventType.FullSnapshot,
    timestamp: 1_700_000_000_010,
    data: {
      node: {
        type: 0,
        id: 1,
        childNodes: [
          {
            type: 2,
            id: 2,
            tagName: 'html',
            attributes: {},
            childNodes: [
              {
                type: 2,
                id: 3,
                tagName: 'head',
                attributes: {},
                childNodes: [],
              },
              {
                type: 2,
                id: 4,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    type: 2,
                    id: 5,
                    tagName: 'main',
                    attributes: {},
                    childNodes: [{ type: 3, id: 6, textContent: 'Replay ready' }],
                  },
                ],
              },
            ],
          },
        ],
      },
      initialOffset: { top: 0, left: 0 },
    },
  },
] as eventWithTime[];
