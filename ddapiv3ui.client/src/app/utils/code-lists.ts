/**
 * Catalogue of the code lists (reference types) of a DD-API service, with readable names,
 * explanations, the useful columns per list, and how a code can be used in the simple
 * search. Based on what AquaDesk offers.
 */

import type { FlatRow } from './flatten';
import { flattenRecord } from './flatten';
import type { Lang } from './i18n';
import { normaliseText, searchTokens } from './list-search';

export type CodeListGroup = 'where' | 'what' | 'how' | 'who' | 'other';

/** Field of the simple search that a code can be used in. */
export type SearchUse =
  | 'organisation' | 'measurementObjects' | 'monitoringNetwork'
  | 'measurementPackages' | 'quantities' | 'compartments' | 'parameters';

export interface CodeListDefinition {
  /** Reference type in the service. */
  type: string;
  group: CodeListGroup;
  /** [Dutch, English] */
  name: [string, string];
  description: [string, string];
  /** Table columns (flattened names). */
  columns: string[];
  /** The list is kept per water authority. */
  byOrganisation?: boolean;
  /** The list is too large to load; it is searched on the server. */
  serverSearch?: boolean;
  useInSearch?: SearchUse;
}

export const CODE_LIST_GROUPS: { id: CodeListGroup, name: [string, string] }[] = [
  { id: 'where', name: ['Waar', 'Where'] },
  { id: 'what', name: ['Wat', 'What'] },
  { id: 'how', name: ['Hoe gemeten', 'How it was measured'] },
  { id: 'who', name: ['Projecten en organisaties', 'Projects and organisations'] },
  { id: 'other', name: ['Overig', 'Other'] }
];

const BASIC = ['Code', 'Name'];
const WITH_SOURCE = ['Code', 'Name', 'Organisation'];

export const CODE_LISTS: CodeListDefinition[] = [
  {
    type: 'Organisation', group: 'where', columns: BASIC, useInSearch: 'organisation',
    name: ['Waterbeheerders', 'Water authorities'],
    description: ['Waterbeheerders, bureaus en andere bronnen van gegevens in deze service.', 'Water authorities, consultancies and other sources of data in this service.']
  },
  {
    type: 'MeasurementObject', group: 'where', byOrganisation: true, useInSearch: 'measurementObjects',
    columns: ['Code', 'Name', 'Geography.X', 'Geography.Y', 'KrwCode', 'IsReportingMeasurementObject'],
    name: ['Meetlocaties', 'Locations'],
    description: ['Meetobjecten (meetpunten) van een waterbeheerder, met coördinaten.', 'Measurement objects (sampling points) of a water authority, with coordinates.']
  },
  {
    type: 'MonitoringNetwork', group: 'where', byOrganisation: true, useInSearch: 'monitoringNetwork',
    columns: ['Code', 'Name', 'MeasurementObjectCount'],
    name: ['Meetnetten', 'Monitoring networks'],
    description: ['Groepen meetlocaties van een waterbeheerder, zoals KRW-meetnetten. Een meetnet kun je gebruiken om in één keer al zijn meetlocaties te kiezen.', 'Groups of locations of a water authority, such as WFD networks. A network can be used to choose all its locations at once.']
  },
  {
    type: 'MeasurementPackage', group: 'what', columns: BASIC, useInSearch: 'measurementPackages',
    name: ['Meetpakketten', 'Measurement packages'],
    description: ['Het soort meting, bijvoorbeeld Planten bedekking. Een meetpakket bepaalt welke grootheden en taxa bij een meting horen.', 'The kind of measurement, for example plant coverage. A package determines which quantities and taxa belong to a measurement.']
  },
  {
    type: 'Quantity', group: 'what', columns: WITH_SOURCE, useInSearch: 'quantities',
    name: ['Grootheden en typeringen', 'Quantities and classifications'],
    description: ['Wat er gemeten is, zoals Bedekking of Doorzicht, en Aquo-typeringen zoals Kwelindicatie.', 'What was measured, such as coverage or transparency, and Aquo classifications.']
  },
  {
    type: 'Parameter', group: 'what', serverSearch: true, useInSearch: 'parameters',
    columns: ['Code', 'ParameterType', 'TaxonType', 'TaxonGroup', 'TaxonRank', 'TaxonStatus', 'TaxonTwnCode', 'TaxonSynonymOf'],
    name: ['Parameters en taxa', 'Parameters and taxa'],
    description: ['Stoffen, fysische parameters en biologische soorten (TWN-lijst). De lijst is groot: zoek op (een deel van) de naam.', 'Substances, physical parameters and species (TWN list). The list is large: search by (part of) the name.']
  },
  {
    type: 'Compartment', group: 'what', columns: WITH_SOURCE, useInSearch: 'compartments',
    name: ['Compartimenten', 'Compartments'],
    description: ['Waarin gemeten is: oppervlaktewater, bodem, oever en dergelijke.', 'What was sampled: surface water, sediment, bank and so on.']
  },
  {
    type: 'Unit', group: 'what', columns: WITH_SOURCE,
    name: ['Eenheden', 'Units'],
    description: ['Eenheden van meetwaarden volgens Aquo.', 'Units of measured values (Aquo).']
  },
  {
    type: 'TaxonGroup', group: 'what', columns: WITH_SOURCE,
    name: ['Taxongroepen', 'Taxon groups'],
    description: ['Biologische groepen volgens de TWN-lijst.', 'Biological groups of the TWN list.']
  },
  {
    type: 'TaxonType', group: 'what', columns: WITH_SOURCE,
    name: ['Taxontypen', 'Taxon types'],
    description: ['Soort organisme volgens TWN, zoals macrofyten of diatomeeën.', 'Kind of organism (TWN), such as macrophytes or diatoms.']
  },
  {
    type: 'AnalysisPackage', group: 'what', columns: WITH_SOURCE,
    name: ['Analysepakketten', 'Analysis packages'],
    description: ['Pakketten van analyses, zoals laboratoria ze gebruiken.', 'Packages of analyses as used by laboratories.']
  },
  {
    type: 'Method', group: 'how', byOrganisation: true, columns: BASIC,
    name: ['Methoden', 'Methods'],
    description: ['Bemonsterings- en analysemethoden van een organisatie.', 'Sampling and analysis methods of an organisation.']
  },
  {
    type: 'MethodCategory', group: 'how', columns: WITH_SOURCE,
    name: ['Methodecategorieën', 'Method categories'],
    description: ['Soorten methoden, zoals bemonsteringsmethode.', 'Kinds of methods, such as sampling method.']
  },
  {
    type: 'AttributeType', group: 'how', columns: WITH_SOURCE,
    name: ['Kenmerktypen', 'Attribute types'],
    description: ['Soorten kenmerken bij metingen, zoals levensstadium en geslacht.', 'Kinds of attributes of measurements, such as life stage and gender.']
  },
  {
    type: 'LimitSymbol', group: 'how', columns: BASIC,
    name: ['Limietsymbolen', 'Limit symbols'],
    description: ['Tekens als < en > bij waarden onder of boven de rapportagegrens.', 'Symbols such as < and > for values below or above the reporting limit.']
  },
  {
    type: 'Purpose', group: 'how', columns: BASIC,
    name: ['Meetdoelen', 'Purposes'],
    description: ['Waarvoor gemeten is: monitoring of kwaliteitscontrole.', 'Why it was measured: monitoring or quality control.']
  },
  {
    type: 'ObservationType', group: 'how', columns: BASIC,
    name: ['Resultaattypen', 'Result types'],
    description: ['Soorten resultaten: een meetwaarde, een aantal of een geometrie.', 'Kinds of results: a measured value, a count or a geometry.']
  },
  {
    type: 'Project', group: 'who', byOrganisation: true, columns: ['Code', 'Name', 'ProjectStart', 'ProjectEnd'],
    name: ['Projecten', 'Projects'],
    description: ['Projecten en opdrachten (zoals OMS-nummers) van een waterbeheerder, met looptijd. Let op: bij de metingen staat (nog) niet bij welk project ze horen.', 'Projects and assignments of a water authority, with their period. Note: observations do not (yet) show which project they belong to.']
  },
  {
    type: 'Relation', group: 'who', byOrganisation: true, columns: BASIC,
    name: ['Relaties', 'Relations'],
    description: ['Organisaties die voor een waterbeheerder bemonsteren, analyseren of controleren.', 'Organisations that sample, analyse or check for a water authority.']
  },
  {
    type: 'KrwWatertype', group: 'other', columns: BASIC,
    name: ['KRW-watertypen', 'WFD water types'],
    description: ['Watertypen volgens de Kaderrichtlijn Water.', 'Water types of the Water Framework Directive.']
  },
  {
    type: 'StowaWatertype', group: 'other', columns: BASIC,
    name: ['STOWA-watertypen', 'STOWA water types'],
    description: ['Watertypen volgens STOWA.', 'Water types according to STOWA.']
  },
  {
    type: 'Literature', group: 'other', columns: BASIC,
    name: ['Literatuur', 'Literature'],
    description: ['Bronnen voor de taxonomie van de TWN-lijst.', 'Sources for the taxonomy of the TWN list.']
  },
  {
    type: 'Standard', group: 'other', columns: BASIC,
    name: ['Standaarden', 'Standards'],
    description: ['Standaarden waarop de service is gebaseerd.', 'Standards the service is based on.']
  }
];

export function listName(definition: CodeListDefinition, lang: Lang): string {
  return definition.name[lang === 'en' ? 1 : 0];
}

export function listDescription(definition: CodeListDefinition, lang: Lang): string {
  return definition.description[lang === 'en' ? 1 : 0];
}

export function groupName(group: CodeListGroup, lang: Lang): string {
  const found = CODE_LIST_GROUPS.find(g => g.id === group);
  return found ? found.name[lang === 'en' ? 1 : 0] : group;
}

/** Code lists whose name, explanation or type match the search text (several words, any order). */
export function filterCodeLists(lists: CodeListDefinition[], text: string, lang: Lang): CodeListDefinition[] {
  const tokens = searchTokens(text);
  if (tokens.length === 0) {
    return lists.slice();
  }
  return lists.filter(list => {
    const hay = ' ' + normaliseText(`${listName(list, lang)} ${listDescription(list, lang)} ${list.type}`) + ' ';
    return tokens.every(token => hay.includes(token));
  });
}

/**
 * Turns a reference record into a table row: nested fields flattened, dates shortened to
 * the day, and the number of locations of a monitoring network added.
 */
export function referenceToRow(record: unknown): FlatRow {
  const row = flattenRecord(record);
  for (const key of ['ProjectStart', 'ProjectEnd', 'ModifiedOn']) {
    const value = row[key];
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      row[key] = value.substring(0, 10);
    }
  }
  const objects = record !== null && typeof record === 'object' ? (record as Record<string, unknown>)['MeasurementObjects'] : undefined;
  if (Array.isArray(objects)) {
    row['MeasurementObjectCount'] = objects.length;
  }
  return row;
}

/**
 * Keeps only the most recent version of references that occur several times with the same
 * code and organisation (AquaDesk lists older versions too, for example three times PT.BD).
 * The order of first appearance is kept.
 */
export function latestVersions(records: unknown[]): unknown[] {
  const latest = new Map<string, { record: unknown, modified: string, index: number }>();
  records.forEach((record, index) => {
    const fields = record !== null && typeof record === 'object' ? record as Record<string, unknown> : {};
    const key = `${String(fields['Code'] ?? '')}|${String(fields['Organisation'] ?? '')}`;
    const modified = typeof fields['ModifiedOn'] === 'string' ? fields['ModifiedOn'] as string : '';
    const current = latest.get(key);
    if (!current) {
      latest.set(key, { record, modified, index });
    } else if (modified > current.modified) {
      latest.set(key, { record, modified, index: current.index });
    }
  });
  return [...latest.values()].sort((a, b) => a.index - b.index).map(entry => entry.record);
}

/** The location codes of a monitoring network record. */
export function networkLocations(record: unknown): string[] {
  const objects = record !== null && typeof record === 'object' ? (record as Record<string, unknown>)['MeasurementObjects'] : undefined;
  return Array.isArray(objects) ? objects.filter((v): v is string => typeof v === 'string' && v.length > 0) : [];
}

/** Rows whose given columns contain all search words (any order, ignoring case and accents). */
export function searchRows(rows: FlatRow[], columns: string[], text: string): FlatRow[] {
  const tokens = searchTokens(text);
  if (tokens.length === 0) {
    return rows;
  }
  return rows.filter(row => {
    const spaced = ' ' + columns.map(c => normaliseText(String(row[c] ?? ''))).join(' ') + ' ';
    const compact = spaced.replace(/ /g, '');
    return tokens.every(token => spaced.includes(token) || compact.includes(token));
  });
}

/** A choice handed over from the code lists to the simple search. */
export interface SearchPreset {
  use: SearchUse;
  options: { value: string, label: string, isTaxon?: boolean }[];
  /** Water authority the codes belong to (for locations and networks). */
  organisation: string | null;
}
