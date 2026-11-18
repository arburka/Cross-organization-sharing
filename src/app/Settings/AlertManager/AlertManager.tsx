import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Label,
  Menu,
  MenuContent,
  MenuItem,
  MenuList,
  MenuToggle,
  NumberInput,
  PageSection,
  Pagination,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Split,
  SplitItem,
  Tab,
  Tabs,
  TabTitleText,
  TimePicker,
  Title,
  Tooltip,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import {
  BookIcon,
  EllipsisVIcon,
} from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import { useDocumentTitle } from '@app/utils/useDocumentTitle';
import { EventDetails } from './EventDetails';
import { notifierMeta, thirdPartyKinds } from './notifiers';
import type { NotifierKind, ThirdPartyKind } from './notifiers';
import { getAddedNotifierKinds, getEventConnections, readConnections } from '@app/Settings/ThirdPartyNotifiers/connections';
import { catalogEvents } from './eventCatalog';

export interface AlertEvent {
  id: string;
  eventType: string;
  service: string;
  notifiers: NotifierKind[];
}

const featuredEvents: AlertEvent[] = [
  { id: 'vuln-exploit', eventType: 'Any vulnerability with known exploit', service: 'Vulnerability | RHEL', notifiers: ['email'] },
  { id: 'availability', eventType: 'Availability Status', service: 'Integrations | Settings', notifiers: ['email', 'drawer'] },
  { id: 'advisor-weekly', eventType: 'Advisor Weekly Report', service: 'Advisor | RHEL', notifiers: ['email', 'slack', 'google-chat'] },
  { id: 'capacity', eventType: 'Capacity Management', service: 'Cluster Management | OpenShift', notifiers: ['drawer', 'slack', 'teams'] },
  { id: 'usage-threshold', eventType: 'Usage at custom threshold', service: 'Subscriptions Usage | Subscription Services', notifiers: ['drawer', 'pagerduty'] },
  { id: 'custom-role', eventType: 'Custom role created', service: 'User Access | IAM', notifiers: ['drawer', 'teams'] },
  { id: 'customer-support', eventType: 'Customer Support', service: 'Cluster Management | OpenShift', notifiers: [] },
  { id: 'deactivated', eventType: 'Deactivated recommendation', service: 'Advisor | RHEL', notifiers: ['email', 'drawer', 'servicenow'] },
  { id: 'cluster-ownership', eventType: 'Cluster Ownership', service: 'Cluster Management | OpenShift', notifiers: ['drawer', 'event-ansible'] },
  { id: 'cluster-security', eventType: 'Cluster Security', service: 'Cluster Management | OpenShift', notifiers: ['email', 'drawer', 'splunk', 'webhooks'] },
];

const additionalEventNames = [
  'Cluster Scaling',
  'Cluster Configuration',
  'Cluster Access',
  'Cluster Add-on',
  'Cluster Lifecycle',
  'Cluster Networking',
  'New recommendation',
  'Critical vulnerability',
  'Malware detected',
  'Policy violation',
  'System not reporting',
  'Patch available',
  'Drift detected',
  'Image build failed',
  'Image build completed',
  'Repository sync failed',
  'Integration disconnected',
  'Webhook delivery failed',
  'User invited',
  'User removed',
  'Group created',
  'Role assigned',
  'Role deleted',
  'Access request submitted',
  'Access request approved',
  'Service account created',
  'API token expiring',
  'Subscription expiring',
  'Subscription renewed',
  'Usage exceeded',
  'Credit balance low',
  'Cost anomaly',
  'Cluster upgrade available',
  'Node pressure',
  'Pod crash looping',
  'Certificate expiring',
  'Compliance failed',
  'Insights rule hit',
  'Advisor daily digest',
  'Inventory stale',
  'Cloud account disconnected',
  'Marketplace purchase',
  'Ansible job failed',
  'Playbook completed',
  'Automation hub sync',
  'OpenShift AI model failed',
  'Pipeline failed',
  'Backup failed',
  'Backup completed',
  'Log volume high',
  'Notification delivery failed',
  'Default notifier changed',
];

const serviceCycle = [
  'Advisor | RHEL',
  'Vulnerability | RHEL',
  'Cluster Management | OpenShift',
  'Integrations | Settings',
  'Subscriptions Usage | Subscription Services',
  'User Access | IAM',
];

const notifierCycle: NotifierKind[][] = [
  ['email'],
  ['drawer', 'google-chat'],
  ['email', 'drawer'],
  ['email', 'slack'],
  ['drawer', 'pagerduty'],
  ['email', 'drawer', 'event-ansible'],
  [],
  ['servicenow'],
  ['splunk'],
  ['email', 'webhooks'],
];

const existingEvents: AlertEvent[] = [
  ...featuredEvents,
  ...additionalEventNames.map((eventType, index) => ({
    id: `event-${index + 1}`,
    eventType,
    service: serviceCycle[index % serviceCycle.length],
    notifiers: notifierCycle[index % notifierCycle.length],
  })),
];

export const initialEvents: AlertEvent[] = [
  ...existingEvents.map((event) => {
    const catalogEvent = catalogEvents.find((item) => item.id === event.id);
    if (!catalogEvent || !/^event-(?:[1-6]|21)$/.test(event.id)) {
      return event;
    }
    return { ...event, service: `${catalogEvent.service} | ${catalogEvent.family}` };
  }),
  ...catalogEvents.filter((event) => !existingEvents.some((existing) => existing.id === event.id)).map((event) => ({
    id: event.id,
    eventType: event.eventType,
    service: `${event.service} | ${event.family === 'Subscription' ? 'Subscription Services' : event.family}`,
    notifiers: [],
  })),
];

interface RecurringSchedule {
  dailyTime: string;
  weeklyDay: string;
  weeklyTime: string;
  monthlyDay: string;
  monthlyTime: string;
}

const initialSchedule: RecurringSchedule = {
  dailyTime: '08:00',
  weeklyDay: 'Monday',
  weeklyTime: '08:00',
  monthlyDay: '1',
  monthlyTime: '08:00',
};

const formatTime = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'} UTC`;
};

const ordinal = (day: number) => {
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
  return `${day}${suffix}`;
};

const AlertManagerSettings: React.FunctionComponent = () => {
  useDocumentTitle('Alert Manager | Settings');
  const { eventId } = useParams<{ eventId: string }>();

  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);
  const [schedule, setSchedule] = React.useState<RecurringSchedule>(initialSchedule);
  const [draftSchedule, setDraftSchedule] = React.useState<RecurringSchedule>(initialSchedule);
  const [isEditingSchedule, setIsEditingSchedule] = React.useState(false);
  const [isWeekdayOpen, setIsWeekdayOpen] = React.useState(false);
  const [successToast, setSuccessToast] = React.useState<{ id: number; title: string; description?: string } | null>(null);
  const toastSequence = React.useRef(0);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(20);
  const [searchValue, setSearchValue] = React.useState('');
  const [filterField, setFilterField] = React.useState<'Event name' | 'Service'>('Event name');
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [events, setEvents] = React.useState<AlertEvent[]>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('alert-manager-event-notifiers') || '{}');
      const addNewAssociations = sessionStorage.getItem('alert-manager-event-associations-version') !== '1';
      return initialEvents.map((event) => {
        const notifiers: NotifierKind[] = Array.isArray(saved[event.id])
          ? saved[event.id].filter((kind: string): kind is NotifierKind => Object.prototype.hasOwnProperty.call(notifierMeta, kind))
          : event.notifiers;
        return {
          ...event,
          notifiers: addNewAssociations ? Array.from(new Set<NotifierKind>([...notifiers, ...getAddedNotifierKinds(event.id)])) : notifiers,
        };
      });
    } catch {
      return initialEvents;
    }
  });
  const [connections] = React.useState(readConnections);
  const [isBulkMenuOpen, setIsBulkMenuOpen] = React.useState(false);
  const [openActionId, setOpenActionId] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<{ index: number; direction: 'asc' | 'desc' }>({
    index: -1,
    direction: 'asc',
  });

  React.useEffect(() => {
    if (selectedIds.size === 0) {
      setIsBulkMenuOpen(false);
    }
  }, [selectedIds]);

  React.useEffect(() => {
    try {
      const saved = events.reduce<Record<string, NotifierKind[]>>((result, event) => {
        result[event.id] = event.notifiers;
        return result;
      }, {});
      sessionStorage.setItem('alert-manager-event-notifiers', JSON.stringify(saved));
      sessionStorage.setItem('alert-manager-event-associations-version', '1');
    } catch {
      // Keep the prototype usable when session storage is unavailable.
    }
  }, [events]);

  const visibleEvents = React.useMemo(() => events.map((event) => {
    const linkedKinds = connections.filter((connection) => connection.eventIds?.includes(event.id)).map((connection) => connection.kind);
    const candidates = Array.from(new Set<NotifierKind>([...event.notifiers, ...linkedKinds]));
    return {
      ...event,
      notifiers: candidates.filter((kind) => !thirdPartyKinds.includes(kind as ThirdPartyKind) || getEventConnections(event.id, kind as ThirdPartyKind, connections, event.notifiers.includes(kind)).length > 0),
    };
  }), [connections, events]);

  const filteredEvents = React.useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const matched = query
      ? visibleEvents.filter((event) =>
          (filterField === 'Event name' ? event.eventType : event.service).toLowerCase().includes(query)
        )
      : visibleEvents;

    if (sortBy.index < 0) {
      return matched;
    }

    const key = sortBy.index === 0 ? 'eventType' : 'service';
    return [...matched].sort((a, b) => {
      const result = a[key].localeCompare(b[key]);
      return sortBy.direction === 'asc' ? result : -result;
    });
  }, [visibleEvents, filterField, searchValue, sortBy]);

  const pageStart = (page - 1) * perPage;
  const pageEvents = filteredEvents.slice(pageStart, pageStart + perPage);
  const pageIds = pageEvents.map((event) => event.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const setPageSelected = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const onSearchChange = (value: string) => {
    setSearchValue(value);
    setPage(1);
  };

  const showSuccessToast = (title: string, description?: string) => {
    toastSequence.current += 1;
    setSuccessToast({ id: toastSequence.current, title, description });
  };

  const updateSelectedNotifiers = (kind: NotifierKind, enabled: boolean) => {
    const selectedNames = events.filter((event) => selectedIds.has(event.id)).map((event) => event.eventType);
    const remainingCount = selectedNames.length - 2;
    const eventSummary = selectedNames.length === 1
      ? selectedNames[0]
      : selectedNames.length === 2
        ? `${selectedNames[0]} and ${selectedNames[1]}`
        : `${selectedNames[0]}, ${selectedNames[1]} and ${remainingCount} other ${remainingCount === 1 ? 'event' : 'events'}`;
    setEvents((current) => current.map((event) => {
      if (!selectedIds.has(event.id)) {
        return event;
      }
      if (event.notifiers.includes(kind) === enabled) {
        return event;
      }
      const notifiers = event.notifiers.filter((notifier) => notifier !== kind);
      if (enabled) {
        notifiers.push(kind);
      }
      return { ...event, notifiers };
    }));
    setIsBulkMenuOpen(false);
    setSelectedIds(new Set());
    showSuccessToast(
      'Events bulk update successful',
      `${eventSummary} ${selectedNames.length === 1 ? 'has' : 'have'} turned ${enabled ? 'on' : 'off'} ${notifierMeta[kind].label.toLowerCase()}`
    );
  };

  const viewRecurringEvents = (frequency: string) => {
    setFilterField('Event name');
    setSearchValue(frequency);
    setPage(1);
    setActiveTabKey(0);
  };

  if (eventId) {
    const event = visibleEvents.find((item) => item.id === eventId);
    const originalEvent = events.find((item) => item.id === eventId);
    return <EventDetails event={event} legacyNotifiers={originalEvent?.notifiers || []} connections={connections} onUpdate={(notifiers) => setEvents((current) => current.map((item) => item.id === eventId ? { ...item, notifiers: [...item.notifiers.filter((kind) => thirdPartyKinds.includes(kind as ThirdPartyKind)), ...notifiers.filter((kind) => !thirdPartyKinds.includes(kind as ThirdPartyKind))] } : item))} />;
  }

  return (
    <>
      <AlertGroup isToast isLiveRegion aria-live="polite" style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
        {successToast && (
          <Alert
            key={successToast.id}
            variant="success"
            title={successToast.title}
            className={successToast.description ? 'settings-alert-manager__bulk-toast' : undefined}
            timeout={6000}
            onTimeout={() => setSuccessToast(null)}
            actionClose={<AlertActionCloseButton onClose={() => setSuccessToast(null)} />}
          >
            {successToast.description}
          </Alert>
        )}
      </AlertGroup>
      <PageSection hasBodyWrapper={false}>
        <Breadcrumb className="settings-alert-manager__breadcrumb">
          <BreadcrumbItem render={({ className }) => <Link className={className} to="/settings/integrations">Settings</Link>} />
          <BreadcrumbItem isActive>Alert Manager</BreadcrumbItem>
        </Breadcrumb>
      </PageSection>

      <PageSection hasBodyWrapper={false}>
        <Split className="settings-alert-manager__heading">
          <SplitItem>
            <span className="settings-alert-manager__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1c0-2-3-2-3-9Z" stroke="#ee0000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 20a2 2 0 0 0 4 0" fill="#151515" />
              </svg>
            </span>
          </SplitItem>
          <SplitItem isFilled>
            <Title headingLevel="h1" size="2xl">Alert Manager</Title>
            <Content component="p" className="settings-alert-manager__description">
              Manage your alert default settings for your Organization and configure how fired events should alert users and groups through various communication channels.
            </Content>
            <Content component="p" className="settings-alert-manager__learn-more">
              <Button
                variant="link"
                isInline
                component="a"
                href="https://docs.redhat.com/en/documentation/red_hat_hybrid_cloud_console/1-latest/html/configuring_notifications_on_the_red_hat_hybrid_cloud_console/index"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Learn more (opens in a new tab)"
                icon={<BookIcon />}
                iconPosition="end"
              >
                Learn more
              </Button>
            </Content>
          </SplitItem>
        </Split>
      </PageSection>

      <PageSection hasBodyWrapper={false}>
        <Tabs activeKey={activeTabKey} onSelect={(_event, tabIndex) => setActiveTabKey(tabIndex)}>
          <Tab eventKey={0} title={<TabTitleText>Events</TabTitleText>} />
          <Tab eventKey={1} title={<TabTitleText>Recurring notification set up</TabTitleText>} />
        </Tabs>
      </PageSection>

      {activeTabKey === 0 ? (
        <PageSection hasBodyWrapper={false} className="settings-alert-manager__events">
          <Toolbar>
            <ToolbarContent>
              <ToolbarGroup variant="filter-group">
                <ToolbarItem>
                  <Dropdown
                    isOpen={isFilterOpen}
                    onSelect={(_event, value) => {
                      setFilterField(value as 'Event name' | 'Service');
                      setIsFilterOpen(false);
                      setPage(1);
                    }}
                    onOpenChange={setIsFilterOpen}
                    toggle={(toggleRef: React.Ref<any>) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsFilterOpen((open) => !open)}
                        isExpanded={isFilterOpen}
                      >
                        {filterField}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      <DropdownItem value="Event name">Event name</DropdownItem>
                      <DropdownItem value="Service">Service</DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </ToolbarItem>
                <ToolbarItem className="settings-alert-manager__search">
                  <SearchInput
                    placeholder="Filter by event type"
                    value={searchValue}
                    onChange={(_event, value) => onSearchChange(value)}
                    onClear={() => onSearchChange('')}
                    aria-label="Filter by event type"
                  />
                </ToolbarItem>
              </ToolbarGroup>
              <ToolbarItem>
                <Dropdown
                  isOpen={isBulkMenuOpen && selectedIds.size > 0}
                  onOpenChange={setIsBulkMenuOpen}
                  containsFlyout
                  popperProps={{ width: 'trigger' }}
                  toggle={(toggleRef: React.Ref<any>) => (
                    <MenuToggle
                      ref={toggleRef}
                      variant="secondary"
                      isDisabled={selectedIds.size === 0}
                      isExpanded={isBulkMenuOpen && selectedIds.size > 0}
                      onClick={() => setIsBulkMenuOpen((open) => !open)}
                    >
                      Manage core platform notifiers
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    {([
                      { kind: 'email', label: 'HCC instant email' },
                      { kind: 'daily-digest', label: 'HCC daily digest' },
                      { kind: 'drawer', label: 'HCC notification drawer' },
                    ] as const).map(({ kind, label }) => (
                      <DropdownItem
                        key={kind}
                        flyoutMenu={
                          <Menu aria-label={`${label} actions`} onSelect={(_event, action) => updateSelectedNotifiers(kind, action === 'on')}>
                            <MenuContent>
                              <MenuList>
                                <MenuItem itemId="on">Turn on</MenuItem>
                                <MenuItem itemId="off">Turn off</MenuItem>
                              </MenuList>
                            </MenuContent>
                          </Menu>
                        }
                      >
                        {label}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>
              <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
                <Pagination
                  isCompact
                  variant="top"
                  itemCount={filteredEvents.length}
                  perPage={perPage}
                  page={page}
                  onSetPage={(_event, nextPage) => setPage(nextPage)}
                  onPerPageSelect={(_event, nextPerPage, nextPage) => {
                    setPerPage(nextPerPage);
                    setPage(nextPage);
                  }}
                  widgetId="alert-manager-top-pagination"
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>

          <Table aria-label="Alert events" className="settings-alert-manager__events-table">
            <Thead>
              <Tr>
                <Th
                  select={{
                    onSelect: (_event, isSelected) => setPageSelected(isSelected),
                    isSelected: allPageSelected,
                  }}
                  aria-label="Select all events on this page"
                />
                <Th
                  width={30}
                  sort={{
                    sortBy,
                    onSort: (_event, index, direction) => setSortBy({ index, direction }),
                    columnIndex: 0,
                  }}
                >
                  Event type
                </Th>
                <Th
                  width={30}
                  sort={{
                    sortBy,
                    onSort: (_event, index, direction) => setSortBy({ index, direction }),
                    columnIndex: 1,
                  }}
                >
                  Service
                </Th>
                <Th
                  info={{
                    tooltip: 'Notifiers that deliver this event to you.',
                    ariaLabel: 'More information about my notifiers',
                  }}
                >
                  My notifiers
                </Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {pageEvents.map((event, rowIndex) => (
                <Tr key={event.id}>
                  <Td
                    select={{
                      rowIndex,
                      onSelect: (_event, isSelected) => {
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (isSelected) {
                            next.add(event.id);
                          } else {
                            next.delete(event.id);
                          }
                          return next;
                        });
                      },
                      isSelected: selectedIds.has(event.id),
                    }}
                  />
                  <Td dataLabel="Event type">
                    <Link className="settings-alert-manager__event-link" to={`/settings/alert-manager/events/${event.id}`}>
                      {event.eventType}
                    </Link>
                  </Td>
                  <Td dataLabel="Service">{event.service}</Td>
                  <Td dataLabel="My notifiers">
                    {event.notifiers.length === 0 ? (
                      <Label variant="outline" color="grey">No notifiers</Label>
                    ) : (
                      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                        {event.notifiers.map((kind) => (
                          <FlexItem key={kind}>
                            <Tooltip content={notifierMeta[kind].label}>
                              <Label variant="outline" color="grey" icon={notifierMeta[kind].icon}>
                                {notifierMeta[kind].label}
                              </Label>
                            </Tooltip>
                          </FlexItem>
                        ))}
                      </Flex>
                    )}
                  </Td>
                  <Td isActionCell>
                    <Dropdown
                      isOpen={openActionId === event.id}
                      onOpenChange={(isOpen) => setOpenActionId(isOpen ? event.id : null)}
                      onSelect={() => setOpenActionId(null)}
                      popperProps={{ position: 'right' }}
                      toggle={(toggleRef: React.Ref<any>) => (
                        <MenuToggle
                          ref={toggleRef}
                          variant="plain"
                          aria-label={`${event.eventType} actions`}
                          onClick={() => setOpenActionId(openActionId === event.id ? null : event.id)}
                        >
                          <EllipsisVIcon />
                        </MenuToggle>
                      )}
                    >
                      <DropdownList>
                        <DropdownItem>Edit notifiers</DropdownItem>
                      </DropdownList>
                    </Dropdown>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Flex justifyContent={{ default: 'justifyContentFlexEnd' }} className="settings-alert-manager__bottom-pagination">
            <FlexItem>
              <Pagination
                variant="bottom"
                itemCount={filteredEvents.length}
                perPage={perPage}
                page={page}
                onSetPage={(_event, nextPage) => setPage(nextPage)}
                onPerPageSelect={(_event, nextPerPage, nextPage) => {
                  setPerPage(nextPerPage);
                  setPage(nextPage);
                }}
                widgetId="alert-manager-bottom-pagination"
              />
            </FlexItem>
          </Flex>
        </PageSection>
      ) : (
        <PageSection hasBodyWrapper={false} className="settings-alert-manager__recurring">
          <Content component="p">Configure the notification schedule for recurring notification.</Content>
          <div className={`settings-alert-manager__schedule${isEditingSchedule ? ' settings-alert-manager__schedule--editing' : ''}`}>
            <div className="settings-alert-manager__schedule-row">
              <strong>Daily digest</strong>
              {isEditingSchedule ? (
                <span className="settings-alert-manager__schedule-controls">
                  <TimePicker aria-label="Daily digest time (UTC)" time={draftSchedule.dailyTime} is24Hour stepMinutes={60} width="9.5rem" onChange={(_event, time) => setDraftSchedule({ ...draftSchedule, dailyTime: time })} />
                  <span>UTC</span>
                </span>
              ) : <><span className="settings-alert-manager__schedule-value">{formatTime(schedule.dailyTime)}</span><Button variant="link" isInline onClick={() => viewRecurringEvents('daily')}>View daily digest events</Button></>}
            </div>
            <div className="settings-alert-manager__schedule-row">
              <strong>Weekly report</strong>
              {isEditingSchedule ? (
                <span className="settings-alert-manager__schedule-controls">
                  <Select
                    isOpen={isWeekdayOpen}
                    selected={draftSchedule.weeklyDay}
                    onOpenChange={setIsWeekdayOpen}
                    onSelect={(_event, day) => {
                      setDraftSchedule({ ...draftSchedule, weeklyDay: String(day) });
                      setIsWeekdayOpen(false);
                    }}
                    shouldFocusToggleOnSelect
                    popperProps={{ width: 'trigger' }}
                    toggle={(toggleRef) => (
                      <MenuToggle ref={toggleRef} className="settings-alert-manager__weekday" aria-label="Weekly report day" isExpanded={isWeekdayOpen} onClick={() => setIsWeekdayOpen(!isWeekdayOpen)}>
                        {draftSchedule.weeklyDay}
                      </MenuToggle>
                    )}
                  >
                    <SelectList>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => <SelectOption key={day} value={day}>{day}</SelectOption>)}
                    </SelectList>
                  </Select>
                  <TimePicker aria-label="Weekly report time (UTC)" time={draftSchedule.weeklyTime} is24Hour stepMinutes={60} width="9.5rem" onChange={(_event, time) => setDraftSchedule({ ...draftSchedule, weeklyTime: time })} />
                  <span>UTC</span>
                </span>
              ) : <><span className="settings-alert-manager__schedule-value">{schedule.weeklyDay} {formatTime(schedule.weeklyTime)}</span><Button variant="link" isInline onClick={() => viewRecurringEvents('weekly')}>View weekly report events</Button></>}
            </div>
            <div className="settings-alert-manager__schedule-row">
              <strong>Monthly report</strong>
              {isEditingSchedule ? (
                <span className="settings-alert-manager__schedule-controls">
                  <NumberInput
                    value={draftSchedule.monthlyDay === '' ? '' : Number(draftSchedule.monthlyDay)}
                    min={1}
                    max={28}
                    widthChars={3}
                    inputAriaLabel="Monthly report day"
                    minusBtnAriaLabel="Decrease monthly report day"
                    plusBtnAriaLabel="Increase monthly report day"
                    onMinus={() => setDraftSchedule({ ...draftSchedule, monthlyDay: String(Math.max(1, Number(draftSchedule.monthlyDay) - 1)) })}
                    onPlus={() => setDraftSchedule({ ...draftSchedule, monthlyDay: String(Math.min(28, Number(draftSchedule.monthlyDay) + 1)) })}
                    onChange={(event) => setDraftSchedule({ ...draftSchedule, monthlyDay: event.currentTarget.value })}
                  />
                  <span>day of the month</span>
                  <TimePicker aria-label="Monthly report time (UTC)" time={draftSchedule.monthlyTime} is24Hour stepMinutes={60} width="9.5rem" onChange={(_event, time) => setDraftSchedule({ ...draftSchedule, monthlyTime: time })} />
                  <span>UTC</span>
                </span>
              ) : <><span className="settings-alert-manager__schedule-value">{ordinal(Number(schedule.monthlyDay))} day of the month at {formatTime(schedule.monthlyTime)}</span><Button variant="link" isInline onClick={() => viewRecurringEvents('monthly')}>View monthly report events</Button></>}
            </div>
          </div>
          <div className="settings-alert-manager__schedule-actions">
            {isEditingSchedule ? (
              <Button variant="primary" isDisabled={!/^([01]\d|2[0-3]):[0-5]\d$/.test(draftSchedule.dailyTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draftSchedule.weeklyTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draftSchedule.monthlyTime) || !/^\d+$/.test(draftSchedule.monthlyDay) || Number(draftSchedule.monthlyDay) < 1 || Number(draftSchedule.monthlyDay) > 28} onClick={() => { setSchedule(draftSchedule); setIsEditingSchedule(false); showSuccessToast('Recurring notification schedule saved'); }}>Save</Button>
            ) : <Button variant="secondary" onClick={() => { setDraftSchedule(schedule); setIsEditingSchedule(true); }}>Edit</Button>}
          </div>
        </PageSection>
      )}
    </>
  );
};

export { AlertManagerSettings };
