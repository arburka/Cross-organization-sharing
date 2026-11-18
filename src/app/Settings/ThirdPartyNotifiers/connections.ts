import { notifierMeta, thirdPartyKinds } from '@app/Settings/AlertManager/notifiers';
import type { ThirdPartyKind } from '@app/Settings/AlertManager/notifiers';

export type ConnectionStatus = 'Success' | 'Ready' | 'Failed';
export interface Connection {
  id: string;
  kind: ThirdPartyKind;
  name: string;
  status: ConnectionStatus;
  enabled: boolean;
  eventIds?: string[];
}

const slackExamples: Array<[string, ConnectionStatus, boolean]> = [
  ['Notification - production group', 'Success', true],
  ['sandy_testing', 'Success', true],
  ['westregion2connection', 'Ready', true],
  ['slack-connection-dev-team', 'Failed', false],
  ['slack-receiver', 'Ready', true],
  ['devOps-channel', 'Success', true],
  ['customer-support-team', 'Ready', false],
  ['testing accounts', 'Success', true],
  ['Cluster notification', 'Success', true],
  ['RHEL security', 'Ready', true],
  ['platform-operations', 'Success', true],
  ['infrastructure-alerts', 'Ready', true],
  ['security-response', 'Success', true],
  ['cloud-ops', 'Success', false],
  ['release-notifications', 'Ready', true],
  ['service-health', 'Success', true],
  ['system-alerts', 'Success', true],
  ['development-team', 'Ready', true],
  ['workspace-alerts', 'Success', true],
  ['incident-response', 'Ready', false],
  ['subscriptions-team', 'Success', true],
  ['automation-notifications', 'Success', true],
];

const extraExamples: Array<Connection & { eventIds: string[] }> = [
  { id: 'teams-ops', kind: 'teams', name: 'Operations incident room', status: 'Success', enabled: true, eventIds: ['capacity'] },
  { id: 'teams-access', kind: 'teams', name: 'Access management team', status: 'Ready', enabled: true, eventIds: ['custom-role'] },
  { id: 'teams-cluster', kind: 'teams', name: 'Cluster operations', status: 'Success', enabled: true, eventIds: ['capacity', 'custom-role'] },
  { id: 'google-advisor', kind: 'google-chat', name: 'Advisor updates', status: 'Success', enabled: true, eventIds: ['advisor-weekly'] },
  { id: 'google-systems', kind: 'google-chat', name: 'Systems notifications', status: 'Ready', enabled: true, eventIds: ['event-2'] },
  { id: 'google-patch', kind: 'google-chat', name: 'Patch coordination', status: 'Success', enabled: true, eventIds: ['event-12'] },
  { id: 'ansible-cluster', kind: 'event-ansible', name: 'Cluster automation', status: 'Success', enabled: true, eventIds: ['cluster-ownership'] },
  { id: 'ansible-network', kind: 'event-ansible', name: 'Network event rules', status: 'Ready', enabled: true, eventIds: ['event-6'] },
  { id: 'ansible-sync', kind: 'event-ansible', name: 'Repository sync rules', status: 'Success', enabled: true, eventIds: ['event-16'] },
  { id: 'pager-usage', kind: 'pagerduty', name: 'Subscription usage incidents', status: 'Success', enabled: true, eventIds: ['usage-threshold'] },
  { id: 'pager-cluster', kind: 'pagerduty', name: 'Cluster lifecycle on-call', status: 'Ready', enabled: true, eventIds: ['event-5'] },
  { id: 'pager-image', kind: 'pagerduty', name: 'Image build on-call', status: 'Success', enabled: true, eventIds: ['event-15'] },
  { id: 'servicenow-advisor', kind: 'servicenow', name: 'Advisor incident queue', status: 'Success', enabled: true, eventIds: ['deactivated'] },
  { id: 'servicenow-security', kind: 'servicenow', name: 'Security incident queue', status: 'Ready', enabled: true, eventIds: ['event-8'] },
  { id: 'servicenow-access', kind: 'servicenow', name: 'Access request workflow', status: 'Success', enabled: true, eventIds: ['event-18'] },
  { id: 'splunk-cluster', kind: 'splunk', name: 'Cluster security events', status: 'Success', enabled: true, eventIds: ['cluster-security'] },
  { id: 'splunk-threats', kind: 'splunk', name: 'Threat monitoring', status: 'Ready', enabled: true, eventIds: ['event-9'] },
  { id: 'splunk-access', kind: 'splunk', name: 'Access audit events', status: 'Success', enabled: true, eventIds: ['event-19'] },
  { id: 'webhooks-security', kind: 'webhooks', name: 'Cluster security webhook', status: 'Success', enabled: true, eventIds: ['cluster-security'] },
  { id: 'webhooks-policy', kind: 'webhooks', name: 'Policy notification endpoint', status: 'Ready', enabled: true, eventIds: ['event-10'] },
  { id: 'webhooks-groups', kind: 'webhooks', name: 'Group changes webhook', status: 'Success', enabled: true, eventIds: ['event-20'] },
];

const additionalConnections: Connection[] = extraExamples.map(({ eventIds: _eventIds, ...connection }) => connection);

const initialConnections: Connection[] = [
  ...slackExamples.map(([name, status, enabled], index) => ({ id: `slack-${index}`, kind: 'slack' as const, name, status, enabled })),
  ...thirdPartyKinds.filter((kind) => kind !== 'slack').map((kind) => ({
    id: `${kind}-example`, kind, name: `${notifierMeta[kind].label} connection`, status: 'Success' as const, enabled: true,
  })),
  ...additionalConnections,
];

const STORAGE_KEY = 'third-party-notifier-connections';
const SEED_VERSION_KEY = 'third-party-notifier-connections-version';

export const readConnections = (): Connection[] => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!Array.isArray(saved)) {
      return initialConnections;
    }
    if (sessionStorage.getItem(SEED_VERSION_KEY) !== '2') {
      const existingIds = new Set(saved.map((connection: Connection) => connection.id));
      const migrated = [...saved, ...additionalConnections.filter((connection) => !existingIds.has(connection.id))];
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      sessionStorage.setItem(SEED_VERSION_KEY, '2');
      return migrated;
    }
    return saved;
  } catch {
    return initialConnections;
  }
};

export const writeConnections = (connections: Connection[]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
    sessionStorage.setItem(SEED_VERSION_KEY, '2');
  } catch {
    // Keep the prototype usable when session storage is unavailable.
  }
};

export const getAddedNotifierKinds = (eventId: string): ThirdPartyKind[] =>
  Array.from(new Set(extraExamples.filter((connection) => connection.eventIds.includes(eventId)).map((connection) => connection.kind)));

// The event examples reference a subset of the organization's sample connections.
export const getEventConnections = (eventId: string, kind: ThirdPartyKind, connections: Connection[], includeExamples = true): Connection[] => {
  const ids = [
    ...(includeExamples ? (kind === 'slack' ? ['slack-5', 'slack-6', 'slack-2'] : [`${kind}-example`]) : []),
    ...(includeExamples ? extraExamples.filter((connection) => connection.kind === kind && connection.eventIds.includes(eventId)).map((connection) => connection.id) : []),
    ...connections.filter((connection) => connection.kind === kind && connection.eventIds?.includes(eventId)).map((connection) => connection.id),
  ];
  return ids.map((id) => connections.find((connection) => connection.id === id && connection.kind === kind)).filter((connection): connection is Connection => !!connection);
};
