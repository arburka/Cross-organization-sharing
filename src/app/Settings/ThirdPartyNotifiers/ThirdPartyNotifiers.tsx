import * as React from 'react';
import {
  Alert, AlertActionCloseButton, AlertGroup, Breadcrumb, BreadcrumbItem, Button, Content,
  Dropdown, DropdownItem, DropdownList, Flex, FlexItem, Form, FormGroup, MenuToggle,
  Modal, ModalBody, ModalFooter, ModalHeader, PageSection, Pagination, SearchInput,
  Split, SplitItem, Switch, Tab, Tabs, TabTitleIcon, TabTitleText, TextInput, Title,
  Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem, Wizard, WizardHeader, WizardStep,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { BookIcon, CheckCircleIcon, ConnectedIcon, EllipsisVIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '@app/utils/useDocumentTitle';
import { notifierMeta, thirdPartyKinds } from '@app/Settings/AlertManager/notifiers';
import { initialEvents } from '@app/Settings/AlertManager/AlertManager';
import { catalogEvents, eventFamilies } from '@app/Settings/AlertManager/eventCatalog';
import type { CatalogEvent, EventFamily } from '@app/Settings/AlertManager/eventCatalog';
import type { ThirdPartyKind } from '@app/Settings/AlertManager/notifiers';
import { readConnections, writeConnections } from './connections';
import type { Connection } from './connections';
import { EventSelection } from './EventSelection';

const ThirdPartyNotifiers: React.FunctionComponent = () => {
  useDocumentTitle('Third-party notifiers | Settings');
  const [params, setParams] = useSearchParams();
  const requestedKind = params.get('type');
  const activeKind: ThirdPartyKind = thirdPartyKinds.includes(requestedKind as ThirdPartyKind) ? requestedKind as ThirdPartyKind : 'slack';
  const [connections, setConnections] = React.useState<Connection[]>(readConnections);
  const [search, setSearch] = React.useState(params.get('name') || '');
  const [filterField, setFilterField] = React.useState<'Name' | 'Status'>('Name');
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [sortBy, setSortBy] = React.useState<{ index: number; direction: 'asc' | 'desc' }>({ index: -1, direction: 'asc' });
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(params.get('add') === '1');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [connectionName, setConnectionName] = React.useState('');
  const [connectionUrl, setConnectionUrl] = React.useState('');
  const [selectedEventIds, setSelectedEventIds] = React.useState<Set<string>>(() => {
    const eventId = params.get('event');
    return new Set(eventId && initialEvents.some((event) => event.id === eventId) ? [eventId] : []);
  });
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    writeConnections(connections);
  }, [connections]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = connections.filter((connection) => connection.kind === activeKind && (!query || (filterField === 'Name' ? connection.name : connection.status).toLowerCase().includes(query)));
    if (sortBy.index < 0) {
      return result;
    }
    return [...result].sort((a, b) => {
      const comparison = sortBy.index === 0 ? a.name.localeCompare(b.name) : sortBy.index === 1 ? a.status.localeCompare(b.status) : Number(a.enabled) - Number(b.enabled);
      return sortBy.direction === 'asc' ? comparison : -comparison;
    });
  }, [activeKind, connections, filterField, search, sortBy]);

  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);
  const deletion = connections.find((connection) => connection.id === deleteId);
  const openEditor = (connection?: Connection) => {
    setEditingId(connection?.id || null);
    setConnectionName(connection?.name || '');
    setConnectionUrl('');
    setSelectedEventIds(new Set());
    setOpenMenuId(null);
    setIsEditorOpen(true);
  };
  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingId(null);
    setConnectionName('');
    setConnectionUrl('');
    setSelectedEventIds(new Set());
    if (params.has('add')) {
      setParams({ type: activeKind }, { replace: true });
    }
  };
  const saveConnection = () => {
    const name = connectionName.trim();
    if (!name) {
      return;
    }
    if (editingId) {
      setConnections((current) => current.map((item) => item.id === editingId ? { ...item, name } : item));
      setToast('Connection updated');
    } else {
      setConnections((current) => [{ id: `${activeKind}-${Date.now()}`, kind: activeKind, name, status: 'Ready', enabled: true, eventIds: Array.from(selectedEventIds) }, ...current]);
      setPage(1);
      setSearch('');
      setToast('Connection added');
    }
    closeEditor();
  };
  const updatePage = (_event: unknown, nextPage: number) => setPage(nextPage);
  const updatePerPage = (_event: unknown, nextPerPage: number, nextPage: number) => { setPerPage(nextPerPage); setPage(nextPage); };
  const isValidUrl = (() => {
    try {
      const url = new URL(connectionUrl.trim());
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  })();
  const selectedEvents = initialEvents.filter((event) => selectedEventIds.has(event.id));
  const originatingEvent = initialEvents.find((event) => event.id === params.get('event'));
  const originatingFamily: EventFamily = originatingEvent?.service.includes('OpenShift') ? 'OpenShift' : originatingEvent?.service.includes('Subscription') ? 'Subscription' : originatingEvent?.service.includes('RHEL') ? 'RHEL' : 'Console';
  const extraEvent: CatalogEvent | undefined = originatingEvent && !catalogEvents.some((event) => event.id === originatingEvent.id)
    ? { id: originatingEvent.id, eventType: originatingEvent.eventType, family: originatingFamily, service: originatingEvent.service.split(' | ')[0] }
    : undefined;
  const selectEvents = (ids: string[], checked: boolean) => setSelectedEventIds((current) => {
    const next = new Set(current);
    ids.forEach((id) => checked ? next.add(id) : next.delete(id));
    return next;
  });

  return (
    <>
      <AlertGroup isToast isLiveRegion aria-live="polite" style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
        {toast && <Alert variant="success" title={toast} timeout={6000} onTimeout={() => setToast(null)} actionClose={<AlertActionCloseButton onClose={() => setToast(null)} />} />}
      </AlertGroup>
      <PageSection hasBodyWrapper={false}>
        <Breadcrumb className="settings-alert-manager__breadcrumb"><BreadcrumbItem render={({ className }) => <Link className={className} to="/settings/integrations">Settings</Link>} /><BreadcrumbItem isActive>Third-party notifiers</BreadcrumbItem></Breadcrumb>
      </PageSection>
      <PageSection hasBodyWrapper={false}>
        <Split className="third-party-notifiers__heading">
          <SplitItem><span className="settings-alert-manager__icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="15" cy="15" r="10" stroke="#151515" strokeWidth="2" strokeDasharray="2.5 3" /><circle cx="24" cy="7" r="2.5" fill="#fff" stroke="#ee0000" strokeWidth="2" /><circle cx="23" cy="24" r="5" fill="#fff" stroke="#ee0000" strokeWidth="2" /></svg></span></SplitItem>
          <SplitItem isFilled><Title headingLevel="h1" size="2xl">Third-party notifiers</Title><Content component="p" className="settings-alert-manager__description">You can configure the Hybrid Cloud Console to send event notifications to all users on a new or existing channel across different third-party notifier(s).</Content><Content component="p" className="settings-alert-manager__learn-more"><Button variant="link" isInline component="a" href="https://docs.redhat.com/en/documentation/red_hat_hybrid_cloud_console/1-latest/html/configuring_notifications_on_the_red_hat_hybrid_cloud_console/index" target="_blank" rel="noopener noreferrer" aria-label="Learn more (opens in a new tab)" icon={<BookIcon />} iconPosition="end">Learn more</Button></Content></SplitItem>
        </Split>
      </PageSection>
      <PageSection hasBodyWrapper={false} className="third-party-notifiers__tabs">
        <Tabs activeKey={activeKind} onSelect={(_event, tabIndex) => { setParams({ type: String(tabIndex) }); setSearch(''); setPage(1); setSortBy({ index: -1, direction: 'asc' }); }}>
          {thirdPartyKinds.map((kind) => <Tab key={kind} eventKey={kind} title={<><TabTitleIcon>{notifierMeta[kind].icon}</TabTitleIcon><TabTitleText>{notifierMeta[kind].label}</TabTitleText></>} />)}
        </Tabs>
      </PageSection>
      <PageSection hasBodyWrapper={false} className="third-party-notifiers__content">
        <Toolbar><ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem><Dropdown isOpen={isFilterOpen} onOpenChange={setIsFilterOpen} onSelect={(_event, value) => { setFilterField(value as 'Name' | 'Status'); setIsFilterOpen(false); setSearch(''); setPage(1); }} toggle={(ref: React.Ref<any>) => <MenuToggle ref={ref} isExpanded={isFilterOpen} onClick={() => setIsFilterOpen((open) => !open)}>{filterField}</MenuToggle>}><DropdownList><DropdownItem value="Name">Name</DropdownItem><DropdownItem value="Status">Status</DropdownItem></DropdownList></Dropdown></ToolbarItem>
            <ToolbarItem className="third-party-notifiers__search"><SearchInput aria-label={filterField === 'Name' ? 'Filter by notifier name' : 'Filter by status'} placeholder={filterField === 'Name' ? 'Filter by notifier name' : 'Filter by status'} value={search} onChange={(_event, value) => { setSearch(value); setPage(1); }} onClear={() => { setSearch(''); setPage(1); }} /></ToolbarItem>
          </ToolbarGroup>
          <ToolbarItem><Button variant="primary" onClick={() => openEditor()}>Add connection</Button></ToolbarItem>
          <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}><Pagination isCompact variant="top" itemCount={filtered.length} perPage={perPage} page={page} onSetPage={updatePage} onPerPageSelect={updatePerPage} widgetId="third-party-top-pagination" /></ToolbarItem>
        </ToolbarContent></Toolbar>
        <Table aria-label={`${notifierMeta[activeKind].label} connections`} className="third-party-notifiers__table">
          <Thead><Tr>
            <Th width={35} sort={{ sortBy, onSort: (_event, index, direction) => setSortBy({ index, direction }), columnIndex: 0 }}>Name</Th>
            <Th width={35} sort={{ sortBy, onSort: (_event, index, direction) => setSortBy({ index, direction }), columnIndex: 1 }}>Last connection attempt</Th>
            <Th sort={{ sortBy, onSort: (_event, index, direction) => setSortBy({ index, direction }), columnIndex: 2 }}>Enabled</Th>
            <Th screenReaderText="Actions" />
          </Tr></Thead>
          <Tbody>{pageRows.map((connection) => <Tr key={connection.id}>
            <Td dataLabel="Name">{connection.name}</Td>
            <Td dataLabel="Last connection attempt"><span className={`third-party-notifiers__status third-party-notifiers__status--${connection.status.toLowerCase()}`}>{connection.status === 'Success' ? <CheckCircleIcon /> : connection.status === 'Failed' ? <ExclamationCircleIcon /> : <ConnectedIcon />}</span> {connection.status}</Td>
            <Td dataLabel="Enabled"><Switch id={`connection-enabled-${connection.id}`} aria-label={`Enable ${connection.name}`} hasCheckIcon isChecked={connection.enabled} onChange={(_event, checked) => setConnections((current) => current.map((item) => item.id === connection.id ? { ...item, enabled: checked } : item))} /></Td>
            <Td isActionCell><Dropdown isOpen={openMenuId === connection.id} onOpenChange={(open) => setOpenMenuId(open ? connection.id : null)} popperProps={{ position: 'right' }} toggle={(ref: React.Ref<any>) => <MenuToggle ref={ref} variant="plain" aria-label={`${connection.name} actions`} isExpanded={openMenuId === connection.id} onClick={() => setOpenMenuId(openMenuId === connection.id ? null : connection.id)}><EllipsisVIcon /></MenuToggle>}><DropdownList><DropdownItem onClick={() => openEditor(connection)}>Edit connection</DropdownItem><DropdownItem onClick={() => { setOpenMenuId(null); setDeleteId(connection.id); }}>Delete connection</DropdownItem></DropdownList></Dropdown></Td>
          </Tr>)}</Tbody>
        </Table>
        {filtered.length === 0 && <div className="third-party-notifiers__empty">No connections found.</div>}
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }} className="settings-alert-manager__bottom-pagination"><FlexItem><Pagination variant="bottom" itemCount={filtered.length} perPage={perPage} page={page} onSetPage={updatePage} onPerPageSelect={updatePerPage} widgetId="third-party-bottom-pagination" /></FlexItem></Flex>
      </PageSection>
      <Modal variant="large" isOpen={isEditorOpen && !editingId} onClose={closeEditor} aria-label={`Add ${notifierMeta[activeKind].label} connection`} className="trusted-wizard-modal third-party-notifiers__wizard-modal">
        <Wizard
          header={<WizardHeader title={`Add ${notifierMeta[activeKind].label} connection`} description={`Configure integrations between ${notifierMeta[activeKind].label} and the Red Hat Hybrid Cloud Console.`} onClose={closeEditor} />}
          onClose={closeEditor}
          onSave={saveConnection}
          height="min(42rem, calc(100vh - 12rem))"
        >
          <WizardStep id="connection-details" name="Connection details" footer={{ isBackHidden: true, isNextDisabled: !connectionName.trim() || !isValidUrl }}>
            <Title headingLevel="h2" size="lg">Enter connection details</Title>
            <Content component="p" className="third-party-notifiers__wizard-intro">Enter the details for your {notifierMeta[activeKind].label} connection</Content>
            <Form className="third-party-notifiers__wizard-form">
              <FormGroup label="Connection name" isRequired fieldId="new-connection-name"><TextInput id="new-connection-name" value={connectionName} onChange={(_event, value) => setConnectionName(value)} placeholder="Enter a connection name" isRequired /></FormGroup>
              <FormGroup label={activeKind === 'slack' ? 'Slack workspace URL' : `${notifierMeta[activeKind].label} connection URL`} isRequired fieldId="new-connection-url"><TextInput id="new-connection-url" type="url" value={connectionUrl} onChange={(_event, value) => setConnectionUrl(value)} placeholder={`https://hooks.${notifierMeta[activeKind].label.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/example`} isRequired /></FormGroup>
            </Form>
          </WizardStep>
          <WizardStep id="associate-events" name="Associate event types" isDisabled={!connectionName.trim() || !isValidUrl} isExpandable steps={eventFamilies.map((family) => (
            <WizardStep key={family} id={`associate-${family}`} name={family}>
              <EventSelection family={family} selectedIds={selectedEventIds} onSelect={selectEvents} extraEvent={extraEvent} />
            </WizardStep>
          ))} />
          <WizardStep id="review-connection" name="Review" isDisabled={!connectionName.trim() || !isValidUrl} footer={{ nextButtonText: 'Add connection' }}>
            <Title headingLevel="h2" size="lg">Review connection</Title>
            <Content component="p" className="third-party-notifiers__wizard-intro">Review the connection details and associated event types.</Content>
            <div className="third-party-notifiers__review"><div><strong>Connection name</strong><span>{connectionName.trim()}</span></div><div><strong>{activeKind === 'slack' ? 'Slack workspace URL' : 'Connection URL'}</strong><span className="third-party-notifiers__review-url">{connectionUrl.trim()}</span></div><div><strong>Associated event types</strong>{selectedEvents.length ? <ul>{selectedEvents.map((event) => <li key={event.id}>{event.eventType}</li>)}</ul> : <span>No events selected</span>}</div></div>
          </WizardStep>
        </Wizard>
      </Modal>
      <Modal variant="small" isOpen={isEditorOpen && !!editingId} onClose={closeEditor} aria-labelledby="connection-modal-title">
        <ModalHeader title="Edit connection" labelId="connection-modal-title" />
        <ModalBody><Form onSubmit={(event) => { event.preventDefault(); saveConnection(); }}><FormGroup label="Connection name" isRequired fieldId="connection-name"><TextInput id="connection-name" value={connectionName} onChange={(_event, value) => setConnectionName(value)} isRequired /></FormGroup></Form></ModalBody>
        <ModalFooter><Button variant="primary" isDisabled={!connectionName.trim()} onClick={saveConnection}>{editingId ? 'Save' : 'Add connection'}</Button><Button variant="link" onClick={closeEditor}>Cancel</Button></ModalFooter>
      </Modal>
      <Modal variant="small" isOpen={!!deleteId} onClose={() => setDeleteId(null)} aria-labelledby="delete-connection-title">
        <ModalHeader title="Delete connection?" labelId="delete-connection-title" /><ModalBody>Delete <strong>{deletion?.name}</strong>?</ModalBody>
        <ModalFooter><Button variant="danger" onClick={() => { setConnections((current) => current.filter((item) => item.id !== deleteId)); setDeleteId(null); setPage(1); setToast('Connection deleted'); }}>Delete</Button><Button variant="link" onClick={() => setDeleteId(null)}>Cancel</Button></ModalFooter>
      </Modal>
    </>
  );
};

export { ThirdPartyNotifiers };
