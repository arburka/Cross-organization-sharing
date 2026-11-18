import * as React from 'react';
import {
  Checkbox, Dropdown, DropdownItem, DropdownList, Label, MenuToggle, Pagination, SearchInput,
  Title, Toolbar, ToolbarContent, ToolbarItem,
} from '@patternfly/react-core';
import { AngleDoubleDownIcon, AngleDoubleUpIcon, BookmarkIcon, CaretDownIcon, CaretUpIcon, EqualsIcon, FilterIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { catalogEvents } from '@app/Settings/AlertManager/eventCatalog';
import type { CatalogEvent, EventFamily, EventSeverity } from '@app/Settings/AlertManager/eventCatalog';

interface Props {
  family: EventFamily;
  selectedIds: Set<string>;
  onSelect: (ids: string[], checked: boolean) => void;
  extraEvent?: CatalogEvent;
}

const severityMark: Record<EventSeverity, React.ReactNode> = {
  Critical: <BookmarkIcon />, Important: <AngleDoubleUpIcon />, Moderate: <CaretUpIcon />,
  Low: <AngleDoubleDownIcon />, None: <EqualsIcon />,
};

export const EventSelection: React.FunctionComponent<Props> = ({ family, selectedIds, onSelect, extraEvent }) => {
  const [search, setSearch] = React.useState('');
  const [field, setField] = React.useState<'Event type' | 'Service' | 'Severity'>('Event type');
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [selectionOpen, setSelectionOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(family === 'RHEL' ? 20 : 10);
  const filtered = [...catalogEvents, ...(extraEvent ? [extraEvent] : [])].filter((event) => {
    const value = field === 'Event type' ? event.eventType : field === 'Service' ? event.service : event.severity || '';
    return event.family === family && value.toLowerCase().includes(search.trim().toLowerCase());
  });
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);
  const pageIds = pageRows.map((event) => event.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const updatePage = (_event: unknown, next: number) => setPage(next);
  const updatePerPage = (_event: unknown, next: number, nextPage: number) => { setPerPage(next); setPage(nextPage); };

  return <>
    <Title headingLevel="h2" size="lg">Select {family} events</Title>
    <p className="third-party-notifiers__wizard-intro">Select event types you would like your connection to notify you.</p>
    <Toolbar className="connection-events__toolbar"><ToolbarContent>
      <ToolbarItem><div className="connection-events__bulk">
        <Checkbox id={`select-${family}-page`} aria-label={`Select all ${family} events on this page`} isChecked={selectedOnPage === 0 ? false : selectedOnPage === pageIds.length ? true : null} onChange={(_event, checked) => onSelect(pageIds, checked)} />
        <Dropdown isOpen={selectionOpen} onOpenChange={setSelectionOpen} onSelect={() => setSelectionOpen(false)} toggle={(ref: React.Ref<any>) => <MenuToggle ref={ref} aria-label="Select events" variant="plain" icon={<CaretDownIcon />} isExpanded={selectionOpen} onClick={() => setSelectionOpen((open) => !open)} />}><DropdownList>
          <DropdownItem onClick={() => onSelect(filtered.map((event) => event.id), true)}>Select all matching events</DropdownItem>
          <DropdownItem onClick={() => onSelect(filtered.map((event) => event.id), false)}>Select none</DropdownItem>
        </DropdownList></Dropdown>
      </div></ToolbarItem>
      <ToolbarItem><Dropdown isOpen={filterOpen} onOpenChange={setFilterOpen} onSelect={(_event, value) => { setField(value as typeof field); setFilterOpen(false); setSearch(''); setPage(1); }} toggle={(ref: React.Ref<any>) => <MenuToggle ref={ref} isExpanded={filterOpen} onClick={() => setFilterOpen((open) => !open)} icon={<FilterIcon />}>{field}</MenuToggle>}><DropdownList>{(['Event type', 'Service', 'Severity'] as const).map((value) => <DropdownItem key={value} value={value}>{value}</DropdownItem>)}</DropdownList></Dropdown></ToolbarItem>
      <ToolbarItem className="connection-events__search"><SearchInput aria-label={`Filter by ${field.toLowerCase()}`} placeholder={`Filter by ${field.toLowerCase()}`} value={search} onChange={(_event, value) => { setSearch(value); setPage(1); }} onClear={() => { setSearch(''); setPage(1); }} /></ToolbarItem>
      <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}><Pagination isCompact variant="top" itemCount={filtered.length} perPage={perPage} page={page} onSetPage={updatePage} onPerPageSelect={updatePerPage} widgetId={`connection-${family}-top`} /></ToolbarItem>
    </ToolbarContent></Toolbar>
    <Table aria-label={`${family} event types`} className="connection-events__table" variant="compact">
      <Thead><Tr><Th screenReaderText="Select event" /><Th>Event type</Th><Th>Service</Th><Th>Severity</Th></Tr></Thead>
      <Tbody>{pageRows.map((event) => <Tr key={event.id}>
        <Td><Checkbox id={`connection-event-${event.id}`} aria-label={`Select ${event.eventType}`} isChecked={selectedIds.has(event.id)} onChange={(_event, checked) => onSelect([event.id], checked)} /></Td>
        <Td>{event.eventType}</Td><Td>{event.service}</Td>
        <Td>{event.severity && <Label className={`connection-events__severity connection-events__severity--${event.severity.toLowerCase()}`} icon={severityMark[event.severity]}>{event.severity}</Label>}</Td>
      </Tr>)}</Tbody>
    </Table>
    {filtered.length === 0 && <p className="connection-events__empty">No event types found.</p>}
    <div className="connection-events__pagination"><Pagination variant="bottom" itemCount={filtered.length} perPage={perPage} page={page} onSetPage={updatePage} onPerPageSelect={updatePerPage} widgetId={`connection-${family}-bottom`} /></div>
  </>;
};
