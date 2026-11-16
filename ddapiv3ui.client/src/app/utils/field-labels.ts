/**
 * Readable names for DD-API fields: Dutch (Aquo / IM Metingen terms) and English.
 * The technical name is always shown as well, so users can match it with the URL.
 */

import type { Lang } from './i18n';

/** [Dutch, English] per field path. */
const LABELS: Record<string, [string, string]> = {
  // Observation
  'ObservationType': ['Observatietype', 'Observation type'],
  'ResultTime': ['Resultaattijd', 'Result time'],
  'PhenomenonTime/BeginPosition': ['Meetdatum/-tijd (begin)', 'Measurement time (begin)'],
  'PhenomenonTime/EndPosition': ['Meetdatum/-tijd (eind)', 'Measurement time (end)'],
  'ValidTime/BeginPosition': ['Geldig vanaf', 'Valid from'],
  'ValidTime/EndPosition': ['Geldig tot', 'Valid until'],

  // Feature of interest
  'Foi/Code': ['Meetobject (code)', 'Measurement object (code)'],
  'Foi/Name': ['Meetobject (naam)', 'Measurement object (name)'],
  'Foi/Geography': ['Meetobject (locatie)', 'Measurement object (location)'],
  'Foi/Geography/X': ['Meetobject (x)', 'Measurement object (x)'],
  'Foi/Geography/Y': ['Meetobject (y)', 'Measurement object (y)'],
  'Foi/MonitoringNetworks': ['Meetnetten', 'Monitoring networks'],

  // Parameter
  'Parameter/Organisation': ['Organisatie (waterbeheerder)', 'Organisation (water authority)'],
  'Parameter/OrganisationNamespace': ['Organisatie (namespace)', 'Organisation (namespace)'],
  'Parameter/Supplier': ['Leverancier', 'Supplier'],
  'Parameter/MeasurementPackage': ['Meetpakket', 'Measurement package'],
  'Parameter/AnalysisPackage': ['Analysepakket', 'Analysis package'],
  'Parameter/Quantity': ['Grootheid (of typering)', 'Quantity (or classification)'],
  'Parameter/Parameter': ['Parameter / biotaxon', 'Parameter / taxon'],
  'Parameter/ParameterType': ['Parametertype', 'Parameter type'],
  'Parameter/Compartment': ['Compartiment', 'Compartment'],
  'Parameter/Purpose': ['Meetdoel', 'Purpose'],
  'Parameter/Capacity': ['Hoedanigheid', 'Capacity'],
  'Parameter/LimitSymbol': ['Limietsymbool', 'Limit symbol'],
  'Parameter/TwnCode': ['TWN-code', 'TWN code'],
  'Parameter/TaxonGroup': ['Taxongroep', 'Taxon group'],
  'Parameter/TaxonType': ['Taxontype', 'Taxon type'],
  'Parameter/TaxonRank': ['Taxonrang', 'Taxon rank'],
  'Parameter/TaxonStatus': ['Taxonstatus', 'Taxon status'],
  'Parameter/TaxonAuthors': ['Taxonauteurs', 'Taxon authors'],
  'Parameter/LifeStage': ['Levensstadium', 'Life stage'],
  'Parameter/LifeForm': ['Levensvorm', 'Life form'],
  'Parameter/Gender': ['Geslacht', 'Gender'],
  'Parameter/Appearance': ['Verschijningsvorm', 'Appearance'],
  'Parameter/Behaviour': ['Gedrag', 'Behaviour'],
  'Parameter/LengthClass': ['Lengteklasse', 'Length class'],
  'Parameter/Organ': ['Orgaan', 'Organ'],
  'Parameter/Statistic': ['Statistische parameter', 'Statistic'],
  'Parameter/Condition': ['Conditie', 'Condition'],
  'Parameter/MeasurementPosition': ['Meetpositie', 'Measurement position'],
  'Parameter/Sampler': ['Monsternemer', 'Sampler'],
  'Parameter/Checker': ['Controleur', 'Checker'],
  'Parameter/CasNumber': ['CAS-nummer', 'CAS number'],
  'Parameter/GrainSizeFraction': ['Korrelgroottefractie', 'Grain size fraction'],
  'Parameter/SamplingMethod': ['Bemonsteringsmethode', 'Sampling method'],
  'Parameter/AnalysisMethod': ['Analysemethode', 'Analysis method'],
  'Parameter/ValuationMethod': ['Waardebepalingsmethode', 'Valuation method'],
  'Parameter/ValuationTechnique': ['Waardebepalingstechniek', 'Valuation technique'],
  'Parameter/ValueProcessingMethod': ['Waardebewerkingsmethode', 'Value processing method'],

  // Metadata
  'Metadata/Projects': ['Projecten', 'Projects'],
  'Metadata/SampleReference': ['Monsterreferentie', 'Sample reference'],
  'Metadata/ObservationComment': ['Opmerking meting', 'Observation comment'],
  'Metadata/CollectionComment': ['Opmerking collectie', 'Collection comment'],
  'Metadata/SetComment': ['Opmerking meetset', 'Set comment'],
  'Metadata/ModifiedOn': ['Laatst gewijzigd', 'Last modified'],
  'Metadata/BaseUnit': ['Basiseenheid', 'Base unit'],
  'Metadata/BaseValue': ['Basiswaarde', 'Base value'],

  // Result
  'Result/Measure/Value': ['Waarde (numeriek)', 'Value (numeric)'],
  'Result/Measure/Uom': ['Eenheid', 'Unit'],
  'Result/Vocab/Vocabulary': ['Typering', 'Classification'],
  'Result/Vocab/Term': ['Waarde (typering)', 'Value (classification)'],
  'Result/Vocab/Verb': ['Waarde (typering)', 'Value (classification)'],
  'Result/Count': ['Aantal', 'Count'],
  'Result/Truth': ['Waar/onwaar', 'True/false'],

  // Combined table columns
  'Value': ['Waarde', 'Value'],
  'Unit': ['Eenheid', 'Unit'],

  // References
  'Code': ['Code', 'Code'],
  'Type': ['Soort', 'Type'],
  'ParameterType': ['Parametertype', 'Parameter type'],
  'TaxonType': ['Taxontype', 'Taxon type'],
  'TaxonGroup': ['Taxongroep', 'Taxon group'],
  'TaxonRank': ['Taxonrang', 'Taxon rank'],
  'TaxonStatus': ['Status', 'Status'],
  'TaxonTwnCode': ['TWN-code', 'TWN code'],
  'TaxonAuthors': ['Auteurs', 'Authors'],
  'TaxonSynonymOf': ['Synoniem van', 'Synonym of'],
  'TaxonParent': ['Hoger taxon', 'Parent taxon'],
  'TaxonCitation': ['Bron', 'Citation'],
  'TaxonLiterature': ['Literatuur', 'Literature'],
  'ProjectStart': ['Begindatum', 'Start date'],
  'ProjectEnd': ['Einddatum', 'End date'],
  'KrwCode': ['KRW-code', 'WFD code'],
  'IsReportingMeasurementObject': ['Rapportagelocatie', 'Reporting location'],
  'Weighting': ['Weging', 'Weighting'],
  'MeasurementObjects': ['Meetlocaties', 'Locations'],
  'MeasurementObjectCount': ['Aantal meetlocaties', 'Number of locations'],
  'Geography/X': ['Lengtegraad (x)', 'Longitude (x)'],
  'Geography/Y': ['Breedtegraad (y)', 'Latitude (y)'],
  'ModifiedOn': ['Laatst gewijzigd', 'Last modified'],
  'Name': ['Omschrijving', 'Description'],
  'Description': ['Omschrijving', 'Description'],
  'Organisation': ['Organisatie', 'Organisation']
};

/** Normalises table column names (`Foi.Code`) to property paths (`Foi/Code`). */
function toPath(name: string): string {
  return name.replace(/\./g, '/');
}

/** Returns the readable name of a field, or null when there is none. */
export function fieldLabel(name: string, lang: Lang = 'nl'): string | null {
  const labels = LABELS[toPath(name)];
  return labels ? labels[lang === 'en' ? 1 : 0] : null;
}

/** Text for selection lists: "Meetpakket (Parameter/MeasurementPackage)". */
export function fieldDisplayName(name: string, lang: Lang = 'nl'): string {
  const label = fieldLabel(name, lang);
  return label && label !== name ? `${label} (${name})` : name;
}
