/**
 * Readable Dutch names (Aquo / IM Metingen terms) for DD-API fields, so that users who
 * know the water management terms can find the right field. The technical name is
 * always shown as well.
 */

const LABELS: Record<string, string> = {
  // Observation
  'ObservationType': 'Observatietype',
  'Type': 'Type',
  'ResultTime': 'Resultaattijd',
  'PhenomenonTime/BeginPosition': 'Meetdatum/-tijd (begin)',
  'PhenomenonTime/EndPosition': 'Meetdatum/-tijd (eind)',
  'ValidTime/BeginPosition': 'Geldig vanaf',
  'ValidTime/EndPosition': 'Geldig tot',

  // Feature of interest
  'Foi/Code': 'Meetobject (code)',
  'Foi/Name': 'Meetobject (naam)',
  'Foi/Geography': 'Meetobject (locatie)',
  'Foi/Geography/X': 'Meetobject (x)',
  'Foi/Geography/Y': 'Meetobject (y)',
  'Foi/MonitoringNetworks': 'Meetnetten',

  // Parameter
  'Parameter/Organisation': 'Organisatie (waterbeheerder)',
  'Parameter/OrganisationNamespace': 'Organisatie (namespace)',
  'Parameter/Supplier': 'Leverancier',
  'Parameter/MeasurementPackage': 'Meetpakket',
  'Parameter/AnalysisPackage': 'Analysepakket',
  'Parameter/Quantity': 'Grootheid (of typering)',
  'Parameter/Parameter': 'Parameter / biotaxon',
  'Parameter/ParameterType': 'Parametertype',
  'Parameter/Compartment': 'Compartiment',
  'Parameter/Purpose': 'Meetdoel',
  'Parameter/Capacity': 'Hoedanigheid',
  'Parameter/LimitSymbol': 'Limietsymbool',
  'Parameter/TwnCode': 'TWN-code',
  'Parameter/TaxonGroup': 'Taxongroep',
  'Parameter/TaxonType': 'Taxontype',
  'Parameter/TaxonRank': 'Taxonrang',
  'Parameter/TaxonStatus': 'Taxonstatus',
  'Parameter/TaxonAuthors': 'Taxonauteurs',
  'Parameter/LifeStage': 'Levensstadium',
  'Parameter/LifeForm': 'Levensvorm',
  'Parameter/Gender': 'Geslacht',
  'Parameter/Appearance': 'Verschijningsvorm',
  'Parameter/Behaviour': 'Gedrag',
  'Parameter/LengthClass': 'Lengteklasse',
  'Parameter/Organ': 'Orgaan',
  'Parameter/Statistic': 'Statistische parameter',
  'Parameter/Condition': 'Conditie',
  'Parameter/MeasurementPosition': 'Meetpositie',
  'Parameter/Sampler': 'Monsternemer',
  'Parameter/Checker': 'Controleur',
  'Parameter/CasNumber': 'CAS-nummer',
  'Parameter/GrainSizeFraction': 'Korrelgroottefractie',
  'Parameter/SamplingMethod': 'Bemonsteringsmethode',
  'Parameter/AnalysisMethod': 'Analysemethode',
  'Parameter/ValuationMethod': 'Waardebepalingsmethode',
  'Parameter/ValuationTechnique': 'Waardebepalingstechniek',
  'Parameter/ValueProcessingMethod': 'Waardebewerkingsmethode',

  // Metadata
  'Metadata/Projects': 'Projecten',
  'Metadata/SampleReference': 'Monsterreferentie',
  'Metadata/ObservationComment': 'Opmerking meting',
  'Metadata/CollectionComment': 'Opmerking collectie',
  'Metadata/SetComment': 'Opmerking meetset',
  'Metadata/ModifiedOn': 'Laatst gewijzigd',
  'Metadata/BaseUnit': 'Basiseenheid',
  'Metadata/BaseValue': 'Basiswaarde',

  // Result
  'Result/Measure/Value': 'Waarde (numeriek)',
  'Result/Measure/Uom': 'Eenheid',
  'Result/Vocab/Vocabulary': 'Typering',
  'Result/Vocab/Term': 'Waarde (typering)',
  'Result/Vocab/Verb': 'Waarde (typering)',
  'Result/Count': 'Aantal',
  'Result/Truth': 'Waar/onwaar',

  // Combined table columns
  'Value': 'Waarde',
  'Unit': 'Eenheid',

  // References
  'Code': 'Code',
  'Name': 'Omschrijving',
  'Description': 'Omschrijving',
  'Organisation': 'Organisatie'
};

/** Normalises table column names (`Foi.Code`) to property paths (`Foi/Code`). */
function toPath(name: string): string {
  return name.replace(/\./g, '/');
}

/** Returns the Dutch name of a field, or null when there is none. */
export function fieldLabel(name: string): string | null {
  return LABELS[toPath(name)] ?? null;
}

/** Text for selection lists: "Meetpakket (Parameter/MeasurementPackage)". */
export function fieldDisplayName(name: string): string {
  const label = fieldLabel(name);
  return label && label !== name ? `${label} (${name})` : name;
}
