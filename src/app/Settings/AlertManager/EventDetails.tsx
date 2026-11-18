import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Button, Content, ExpandableSection, Label, PageSection, Split, SplitItem, Switch, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { CheckCircleIcon, ConnectedIcon, EnvelopeIcon, ExclamationCircleIcon, OpenDrawerRightIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import type { AlertEvent } from './AlertManager';
import { notifierMeta, thirdPartyKinds } from './notifiers';
import type { NotifierKind, ThirdPartyKind } from './notifiers';
import { getEventConnections } from '@app/Settings/ThirdPartyNotifiers/connections';
import type { Connection } from '@app/Settings/ThirdPartyNotifiers/connections';

interface EventDetailsProps {
  event?: AlertEvent;
  connections: Connection[];
  legacyNotifiers: NotifierKind[];
  onUpdate: (notifiers: NotifierKind[]) => void;
}

const preferences: { kind: NotifierKind; label: string; icon: React.ReactNode }[] = [
  { kind: 'email', label: 'Instant email', icon: <EnvelopeIcon /> },
  { kind: 'daily-digest', label: 'Daily digest', icon: <EnvelopeIcon /> },
  { kind: 'drawer', label: 'Notification drawer', icon: <OpenDrawerRightIcon /> },
  ...thirdPartyKinds.map((kind) => ({ kind, ...notifierMeta[kind] })),
];

const descriptions: Record<string, string> = {
  capacity: 'Updating, creating, or deleting node pools, machine pools, compute replicas or quotas (load balancer, storage, etc.).',
};

const EventDetails: React.FunctionComponent<EventDetailsProps> = ({ event, connections, legacyNotifiers, onUpdate }) => {
  const [autosave, setAutosave] = React.useState(true);
  const [draft, setDraft] = React.useState<NotifierKind[]>(event?.notifiers || []);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({ email: true, drawer: true });

  React.useEffect(() => {
    setDraft(event?.notifiers || []);
  }, [event?.id, event?.notifiers]);

  if (!event) {
    return <PageSection hasBodyWrapper={false}><Title headingLevel="h1" size="xl">Event not found</Title><Link to="/settings/alert-manager">Return to Alert Manager</Link></PageSection>;
  }

  const selectedPreferences = preferences.filter(({ kind }) => event.notifiers.includes(kind));
  const setNotifier = (kind: NotifierKind, enabled: boolean) => {
    const next = draft.filter((item) => item !== kind);
    if (enabled) {
      next.push(kind);
    }
    setDraft(next);
    if (autosave) {
      onUpdate(next);
    }
  };

  const toggle = (kind: NotifierKind, label: string) => (
    <div className="alert-event-details__switch-row">
      <strong>{label}</strong>
      <Switch id={`event-${event.id}-${kind}`} aria-label={label} isChecked={draft.includes(kind)} hasCheckIcon onChange={(_event, checked) => setNotifier(kind, checked)} />
      <span>{draft.includes(kind) ? 'On' : 'Off'}</span>
    </div>
  );

  const panel = (id: string, label: string, icon: React.ReactNode, body: React.ReactNode, badge?: string, addConnection = false) => (
    <div className={`alert-event-details__panel${addConnection ? ' alert-event-details__panel--third-party' : ''}`} id={`event-section-${id}`}>
      {addConnection && <Link className="pf-v6-c-button pf-m-secondary alert-event-details__add-connection" to={`/settings/third-party-notifiers?type=${id}&add=1&event=${encodeURIComponent(event.id)}`}>Add connection</Link>}
      <ExpandableSection
        isExpanded={!!expanded[id]}
        onToggle={(_event, isExpanded) => setExpanded((current) => ({ ...current, [id]: isExpanded }))}
        toggleContent={<span className="alert-event-details__panel-title"><span className="alert-event-details__panel-icon">{icon}</span><span>{label}</span>{badge && <Label color={badge === 'Not available' ? 'grey' : 'green'}>{badge}</Label>}</span>}
      >
        {body}
      </ExpandableSection>
    </div>
  );

  const connectionTable = (kind: ThirdPartyKind, rows: Connection[]) => (
    <div className="alert-event-details__connections">
      <Table aria-label="Available connections" variant="compact">
        <Thead><Tr><Th>Name of connections</Th><Th>Last connection attempt</Th></Tr></Thead>
        <Tbody>{rows.map((row) => <Tr key={row.id}><Td><Link to={`/settings/third-party-notifiers?type=${kind}&name=${encodeURIComponent(row.name)}`}>{row.name}</Link></Td><Td><span className={`third-party-notifiers__status--${row.status.toLowerCase()}`}>{row.status === 'Success' ? <CheckCircleIcon /> : row.status === 'Failed' ? <ExclamationCircleIcon /> : <ConnectedIcon />}</span> {row.status}</Td></Tr>)}</Tbody>
      </Table>
    </div>
  );

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Breadcrumb><BreadcrumbItem render={({ className }) => <Link className={className} to="/settings/integrations">Settings</Link>} /><BreadcrumbItem render={({ className }) => <Link className={className} to="/settings/alert-manager">Alert Manager</Link>} /><BreadcrumbItem isActive>{event.eventType}</BreadcrumbItem></Breadcrumb>
      </PageSection>
      <PageSection hasBodyWrapper={false}>
        <Split className="settings-alert-manager__heading">
          <SplitItem><span className="settings-alert-manager__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1c0-2-3-2-3-9Z" stroke="#ee0000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 20a2 2 0 0 0 4 0" fill="#151515" /></svg></span></SplitItem>
          <SplitItem isFilled>
            <div className="alert-event-details__title"><Title headingLevel="h1" size="2xl">{event.eventType}</Title><Label color="grey">{event.service}</Label></div>
            <Content component="p" className="settings-alert-manager__description">{descriptions[event.id] || `Configure how you receive notifications for ${event.eventType}.`}</Content>
          </SplitItem>
        </Split>
      </PageSection>
      <PageSection hasBodyWrapper={false} className="alert-event-details">
        <section className="alert-event-details__current" aria-labelledby="event-current-preferences">
          <Title headingLevel="h2" size="lg" id="event-current-preferences">Current preferences</Title>
          <div className="alert-event-details__preference-list">
            {selectedPreferences.length ? selectedPreferences.map(({ kind, label, icon }) => <span key={kind}>{icon} {label}</span>) : <span>No notifiers</span>}
          </div>
        </section>
        <div className="alert-event-details__layout">
          <nav className="alert-event-details__jump" aria-label="Jump to section">
            <strong>Jump to section</strong>
            <div className="alert-event-details__jump-links">
              <a href="#event-core-notifiers">Core platform notifiers</a>
              <a className="alert-event-details__jump-child" href="#event-section-email">Email</a>
              <a className="alert-event-details__jump-child" href="#event-section-drawer">Notification drawer</a>
              <a href="#event-third-party">Third-party notifiers</a>
              {thirdPartyKinds.map((kind) => <a key={kind} className="alert-event-details__jump-child" href={`#event-section-${kind}`}>{notifierMeta[kind].label}</a>)}
            </div>
          </nav>
          <div className="alert-event-details__main">
            <div className="alert-event-details__main-heading">
              <Title headingLevel="h2" size="xl">My alert notifiers</Title>
              <div className="alert-event-details__autosave"><span>Autosave</span><Switch id={`event-${event.id}-autosave`} aria-label="Autosave" isChecked={autosave} hasCheckIcon onChange={(_event, checked) => { if (checked) { onUpdate(draft); } setAutosave(checked); }} />{autosave && <span>Saved</span>}</div>
            </div>
            <Content component="p">View and customize your personal alert settings for email, in-console alerts, third-party direct messages, and Webhooks.</Content>
            {!autosave && <div className="alert-event-details__manual-actions"><Button variant="primary" onClick={() => onUpdate(draft)}>Save changes</Button><Button variant="link" onClick={() => setDraft(event.notifiers)}>Cancel</Button></div>}
            <div className="alert-event-details__section-heading" id="event-core-notifiers"><Title headingLevel="h3" size="lg">Core platform notifiers</Title><Button variant="link" isInline onClick={() => { const next = Array.from(new Set<NotifierKind>([...draft, 'email', 'drawer'])); setDraft(next); if (autosave) { onUpdate(next); } }}>Turn on email and drawer alerts</Button></div>
            {panel('email', 'Email', <EnvelopeIcon />, <><p>Receive alerts to your email address attached to your Red Hat account. Manage your Red Hat account <a href="https://access.redhat.com/management/account" target="_blank" rel="noopener noreferrer">here</a>.</p><div className="alert-event-details__switches">{toggle('email', 'Instant email')}{toggle('daily-digest', 'Daily digest')}</div></>)}
            {panel('drawer', 'Notification drawer', <OpenDrawerRightIcon />, <><p>Receive alerts instantly in your Red Hat Hybrid Cloud Console notification drawer.</p><div className="alert-event-details__switches">{toggle('drawer', 'In-console alerts')}</div></>)}
            <Title headingLevel="h3" size="lg" className="alert-event-details__third-heading" id="event-third-party">Third-party notifiers</Title>
            {thirdPartyKinds.map((kind) => {
              const { label, icon } = notifierMeta[kind];
              const eventConnections = event.notifiers.includes(kind) ? getEventConnections(event.id, kind, connections, legacyNotifiers.includes(kind)) : [];
              const availability = eventConnections.length ? `Available in ${eventConnections.length} ${eventConnections.length === 1 ? 'connection' : 'connections'}` : 'Not available';
              return <React.Fragment key={kind}>{panel(kind, label, icon, <><p>Manage {label} connections on the <Link to={`/settings/third-party-notifiers?type=${kind}`}>Third-party notifiers</Link> page. {eventConnections.length ? 'The table below shows available connections.' : 'No connections are available.'}</p>{eventConnections.length > 0 && connectionTable(kind, eventConnections)}</>, availability, true)}</React.Fragment>;
            })}
          </div>
        </div>
      </PageSection>
    </>
  );
};

export { EventDetails };
