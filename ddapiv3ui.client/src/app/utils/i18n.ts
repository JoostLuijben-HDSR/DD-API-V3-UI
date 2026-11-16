/**
 * Texts of the user interface in Dutch and English.
 *
 * Placeholders such as {count} are replaced by `translate`; numbers are formatted for
 * the chosen language (12.791 in Dutch, 12,791 in English).
 */

export type Lang = 'nl' | 'en';

export const LANGS: Lang[] = ['nl', 'en'];

export type TranslationParams = Record<string, string | number | null | undefined>;

const NL: Record<string, string> = {
  // Header
  'header.baseUrl': 'Basis-URL',
  'header.apiKey': 'API-key',
  'header.endPoint': 'Endpoint',
  'header.coordinateSystem': 'Coördinatenstelsel',
  'header.language': 'Taal',

  // Query options
  'query.top': 'Aantal per pagina ($top)',
  'query.count': 'Totaal tellen ($count)',
  'query.select': 'Kolommen ($select)',
  'query.url': 'URL',

  // Advanced filters
  'filter.title': 'Filters ($filter, {count})',
  'filter.property': 'Veld',
  'filter.value': 'Waarde',
  'filter.and': 'en (and)',
  'filter.or': 'of (or)',
  'filter.not': 'niet (not)',
  'filter.remove': 'Dit filter verwijderen',
  'filter.add': 'FILTER TOEVOEGEN',
  'period.label': 'Meetperiode:',
  'period.from': 'Van',
  'period.to': 'Tot en met',
  'period.add': 'PERIODE TOEVOEGEN',
  'period.addTitle': 'Voegt filters toe op PhenomenonTime/BeginPosition',
  'period.errorEmpty': 'Kies een begindatum, een einddatum of allebei.',
  'period.errorOrder': 'De einddatum ligt voor de begindatum.',

  // Actions
  'action.get': 'OPHALEN',
  'action.cancel': 'STOPPEN',
  'action.next': 'VOLGENDE PAGINA',
  'action.fetchAll': 'ALLE PAGINA\'S OPHALEN',
  'action.fetchAllTitle': 'Volgt alle vervolgpagina\'s en voegt ze samen tot één resultaat',
  'action.maxRecords': 'Max. aantal records',
  'action.csvFormat': 'CSV-formaat',
  'action.csvExcel': 'Excel (puntkomma, decimale komma)',
  'action.csvStandard': 'Standaard (komma, decimale punt)',
  'action.downloadCsv': 'DOWNLOAD CSV',
  'action.downloadCsvTitle': 'De records in het resultaat downloaden als CSV-bestand',

  // Status
  'status.fetching': '{done} van {total} records opgehaald…',
  'status.fetchingNoTotal': '{done} records opgehaald…',
  'status.inResult': '{count} records in het resultaat',
  'status.inTotal': ', {total} in totaal',
  'status.useNext': ' Gebruik VOLGENDE PAGINA of ALLE PAGINA\'S OPHALEN voor meer.',
  'status.stoppedAtMax': ' Gestopt bij het maximum van {max} records.',
  'status.tooLargeForJson': 'Het resultaat is te groot om snel als JSON te tonen. Gebruik DOWNLOAD CSV, of',
  'status.showJsonAnyway': 'TOCH ALS JSON TONEN',

  // Result view
  'result.view': 'Weergave',
  'result.table': 'Tabel',
  'result.json': 'JSON',
  'result.columns': 'Kolommen',
  'result.search': 'Zoeken in resultaat',
  'result.pages': 'Resultaatpagina\'s',

  // Paginator
  'paginator.itemsPerPage': 'Rijen per pagina:',
  'paginator.next': 'Volgende pagina',
  'paginator.previous': 'Vorige pagina',
  'paginator.first': 'Eerste pagina',
  'paginator.last': 'Laatste pagina',
  'paginator.range': '{start} – {end} van {length}',
  'paginator.rangeEmpty': '0 van {length}',

  // Errors
  'error.serviceMessage': 'Melding van de service:',
  'error.noResponse.title': 'Geen antwoord van de service',
  'error.noResponse.hint': 'De service gaf niets terug. Meestal betekent dit dat de API-key ontbreekt of niet geldig is voor deze service. Controleer het veld API-key.',
  'error.unreachable.title': 'De service is niet bereikbaar',
  'error.unreachable.hint': 'Controleer de basis-URL en je netwerkverbinding.',
  'error.missingFilter.title': 'Er is een filter nodig',
  'error.missingFilter.hint': 'Deze service geeft geen gegevens zonder filter. Voeg minstens één filter toe.',
  'error.requiredField.title': 'Een filter op {field} is verplicht',
  'error.requiredField.hint': 'Deze service antwoordt alleen als het filter {path} bevat. Voeg een filter op dit veld toe (bijvoorbeeld met "eq" en een code uit de suggesties).',
  'error.unknownField.title': 'Onbekend veld: {field}',
  'error.unknownField.hint': 'Deze service kent dit veld niet. Kies een veld uit de lijst.',
  'error.unreadableFilter.title': 'Het filter kon niet worden gelezen',
  'error.unreadableFilter.hint': 'Controleer de filterwaarden: tekst tussen aanhalingstekens, datum en tijd als 2025-01-01T00:00:00Z, en lijsten gescheiden door komma\'s.',
  'error.range.title': 'Een parameter valt buiten het toegestane bereik',
  'error.range.hint': 'Het toegestane bereik is {range}. Controleer het aantal per pagina ($top).',
  'error.database.title': 'De service kon het verzoek niet verwerken',
  'error.database.hint': 'Als de zoekvraag klopt, is de API-key mogelijk ingetrokken of heeft hij geen toegang tot deze gegevens. Probeer een andere key, of neem contact op met de gegevensleverancier en noem de RequestId.',
  'error.noAccess.title': 'Geen toegang',
  'error.noAccess.hint': 'De API-key is niet geldig of heeft geen toegang tot deze gegevens. Controleer het veld API-key.',
  'error.urlNotAllowed.title': 'Deze URL wordt niet doorgestuurd',
  'error.urlNotAllowed.hint': 'De server stuurt alleen verzoeken door naar de ingestelde basis-URL\'s.',
  'error.general.title': 'De service gaf een foutmelding',
  'error.general.hint': 'Zie de details hieronder.',
  'error.noKey.title': 'Er is nog geen API-key ingevuld',
  'error.noKey.hint': 'Deze gegevens zijn alleen met een API-key op te vragen. Vul je key in bij API-key, bovenaan de pagina.',
  // Simple search
  'simple.title': 'Eenvoudig zoeken',
  'simple.intro': 'Kies wat je zoekt. Klik in een veld om alle mogelijkheden te zien, of typ om te zoeken op naam of code.',
  'simple.organisation': 'Waterbeheerder',
  'simple.from': 'Meetperiode van',
  'simple.to': 'tot en met',
  'simple.packages': 'Meetpakket',
  'simple.compartments': 'Compartiment',
  'simple.quantities': 'Grootheid of typering',
  'simple.objects': 'Meetlocatie',
  'simple.objectsHint': '{count} meetlocaties van deze waterbeheerder; typ een deel van de naam of code.',
  'simple.objectsNeedOrganisation': 'Kies eerst een waterbeheerder.',
  'simple.parameters': 'Taxon of parameter',
  'simple.parametersHint': 'Typ minstens 2 tekens, bijvoorbeeld "galium" of een stofcode zoals "Cd". Een taxon neemt varianten zoals [1], [2] en ondersoorten mee.',
  'simple.placeholder': 'Klik om te kiezen of typ om te zoeken…',
  'simple.searchPlaceholder': 'Typ om te zoeken…',
  'simple.more': '{shown} van {total} getoond, typ om verder te zoeken',
  'simple.noMatches': 'Niets gevonden',
  'simple.searching': 'Zoeken…',
  'simple.loading': 'Lijst laden…',
  'simple.loadFailed': 'De lijst kon niet worden geladen.',
  'simple.remove': 'Verwijderen',
  'simple.count': '{count} metingen gevonden',
  'simple.counting': 'Metingen tellen…',
  'simple.countNeedsOrganisation': 'Kies een waterbeheerder om te beginnen.',
  'simple.countFailed': 'Het aantal kon niet worden bepaald: {reason}',
  'simple.show': 'TOON RESULTATEN',
  'simple.showTitle': 'Toont de eerste 100 metingen in een tabel',
  'simple.fetchAll': 'ALLES OPHALEN',
  'simple.fetchAllTitle': 'Haalt alle metingen op (tot het maximum); daarna kun je ze als CSV downloaden',
  'simple.clear': 'WIS ALLES',
  'simple.where': 'Waar',
  'simple.when': 'Wanneer',
  'simple.what': 'Wat',
  'list.moreChips': '+{count} meer',
  'list.selectGroup': 'Hele groep kiezen ({count})',
  'list.groupToggle': 'De hele groep kiezen of wissen',
  'dialog.open': 'Alle opties in een groot venster',
  'dialog.search': 'Zoeken op naam of code',
  'dialog.matches': '{count} opties',
  'dialog.selectAll': 'Alle {count} selecteren',
  'dialog.selected': 'Gekozen ({count})',
  'dialog.noneSelected': 'Nog niets gekozen. Vink opties aan in de lijst.',
  'dialog.clear': 'Alles wissen',
  'dialog.cancel': 'Annuleren',
  'dialog.apply': 'Toepassen ({count})',
  'codes.title': 'Codelijsten',
  'codes.intro': 'Hier zie je welke codes deze service kent, zoals waterbeheerders, meetlocaties, meetpakketten, grootheden en taxa. Kies links een lijst; zoek erin, bekijk details, download hem als CSV, of zoek meteen metingen met een code.',
  'codes.lists': 'Codelijsten',
  'codes.searchLists': 'Zoek een codelijst',
  'codes.count': '{count}',
  'codes.choose': 'Kies links een codelijst om de inhoud te zien.',
  'codes.organisation': 'Waterbeheerder',
  'codes.search': 'Zoeken in deze lijst (naam of code)',
  'codes.searchServer': 'Zoeken op naam (minstens 2 tekens)',
  'codes.download': 'DOWNLOAD CSV',
  'codes.needsOrganisation': 'Deze lijst is per waterbeheerder. Kies eerst een waterbeheerder.',
  'codes.needsSearch': 'Deze lijst is te groot om in één keer te tonen. Typ minstens 2 tekens van de naam.',
  'codes.shown': '{shown} van {total} getoond.',
  'codes.truncated': 'Alleen de eerste {count} zijn geladen; zoek om te verfijnen.',
  'codes.useAll': 'Zoek metingen met deze {count}',
  'codes.useOne': 'Zoek metingen met "{name}"',
  'codes.useNetwork': 'Zoek metingen op de {count} meetlocaties van dit meetnet',
  'codes.details': 'Details',
  'codes.closeDetails': 'Details sluiten',
  'codes.versions': '({count} oudere versies samengevoegd)',
  'list.selectAll': 'Alle {count} treffers selecteren',
  'list.more': 'Toon {count} meer',
  'list.recent': 'Recent gebruikt',
  'list.noData': 'geen gegevens',
  'list.showUnavailable': 'Toon ook {count} zonder gegevens voor jouw key',
  'list.hideUnavailable': 'Verberg opties zonder gegevens',
  'list.checking': 'Beschikbaarheid controleren… {done} van {total}',
  'list.checked': '{count} met gegevens',
  'simple.organisationNoKey': 'Vul je API-key in om alleen waterbeheerders met gegevens te zien.',
  'simple.availabilityHint': 'Opties zonder gegevens bij deze waterbeheerder staan grijs onderaan.',
  'advanced.title': 'Geavanceerd',
  'advanced.description': 'Eigen filters, kolommen ($select), URL en headers'
};

const EN: Record<string, string> = {
  'header.baseUrl': 'Base URL',
  'header.apiKey': 'API key',
  'header.endPoint': 'Endpoint',
  'header.coordinateSystem': 'Coordinate system',
  'header.language': 'Language',

  'query.top': 'Records per page ($top)',
  'query.count': 'Count total ($count)',
  'query.select': 'Columns ($select)',
  'query.url': 'URL',

  'filter.title': 'Filters ($filter, {count})',
  'filter.property': 'Field',
  'filter.value': 'Value',
  'filter.and': 'and',
  'filter.or': 'or',
  'filter.not': 'not',
  'filter.remove': 'Remove this filter',
  'filter.add': 'ADD FILTER',
  'period.label': 'Measurement period:',
  'period.from': 'From',
  'period.to': 'To (inclusive)',
  'period.add': 'ADD PERIOD',
  'period.addTitle': 'Adds filters on PhenomenonTime/BeginPosition',
  'period.errorEmpty': 'Choose a start date, an end date or both.',
  'period.errorOrder': 'The end date is before the start date.',

  'action.get': 'GET',
  'action.cancel': 'CANCEL',
  'action.next': 'NEXT',
  'action.fetchAll': 'FETCH ALL PAGES',
  'action.fetchAllTitle': 'Follow all next links and combine the pages into one result',
  'action.maxRecords': 'Max. records',
  'action.csvFormat': 'CSV format',
  'action.csvExcel': 'Excel (semicolon, decimal comma)',
  'action.csvStandard': 'Standard (comma, decimal point)',
  'action.downloadCsv': 'DOWNLOAD CSV',
  'action.downloadCsvTitle': 'Download the records in the result as a CSV file',

  'status.fetching': 'Fetched {done} of {total} records…',
  'status.fetchingNoTotal': 'Fetched {done} records…',
  'status.inResult': '{count} records in result',
  'status.inTotal': ', {total} in total',
  'status.useNext': ' Use NEXT or FETCH ALL PAGES for more.',
  'status.stoppedAtMax': ' Stopped at the maximum of {max} records.',
  'status.tooLargeForJson': 'The result is too large to show as JSON quickly. Use DOWNLOAD CSV, or',
  'status.showJsonAnyway': 'SHOW JSON ANYWAY',

  'result.view': 'Result view',
  'result.table': 'Table',
  'result.json': 'JSON',
  'result.columns': 'Columns',
  'result.search': 'Search in result',
  'result.pages': 'Result pages',

  'paginator.itemsPerPage': 'Items per page:',
  'paginator.next': 'Next page',
  'paginator.previous': 'Previous page',
  'paginator.first': 'First page',
  'paginator.last': 'Last page',
  'paginator.range': '{start} – {end} of {length}',
  'paginator.rangeEmpty': '0 of {length}',

  'error.serviceMessage': 'Message from the service:',
  'error.noResponse.title': 'No response from the service',
  'error.noResponse.hint': 'The service returned nothing. This usually means the API key is missing or not valid for this service. Check the API key field.',
  'error.unreachable.title': 'The service could not be reached',
  'error.unreachable.hint': 'Check the base URL and your network connection.',
  'error.missingFilter.title': 'A filter is required',
  'error.missingFilter.hint': 'This service does not return data without a filter. Add at least one filter.',
  'error.requiredField.title': 'A filter on {field} is required',
  'error.requiredField.hint': 'This service only answers when the filter includes {path}. Add a filter on this field (for example with "eq" and a code from the suggestions).',
  'error.unknownField.title': 'Unknown field: {field}',
  'error.unknownField.hint': 'This service does not know this field. Choose a field from the list.',
  'error.unreadableFilter.title': 'The filter could not be read',
  'error.unreadableFilter.hint': 'Check the filter values: text between quotes, dates and times as 2025-01-01T00:00:00Z, and lists separated by commas.',
  'error.range.title': 'A parameter is outside the allowed range',
  'error.range.hint': 'The allowed range is {range}. Check $top (the number of records per page).',
  'error.database.title': 'The service could not process the request',
  'error.database.hint': 'If the query is correct, the API key may have been revoked or may not have access to this data. Try another API key, or contact the data provider and mention the RequestId.',
  'error.noAccess.title': 'No access',
  'error.noAccess.hint': 'The API key is not valid or has no access to this data. Check the API key field.',
  'error.urlNotAllowed.title': 'This URL is not forwarded',
  'error.urlNotAllowed.hint': 'The server only forwards requests to the configured base URLs.',
  'error.general.title': 'The service returned an error',
  'error.general.hint': 'See the details below.',
  'error.noKey.title': 'No API key has been entered yet',
  'error.noKey.hint': 'This data can only be requested with an API key. Enter your key in the API key field at the top of the page.',
  'simple.title': 'Simple search',
  'simple.intro': 'Choose what you are looking for. Click in a field to see all options, or type to search by name or code.',
  'simple.organisation': 'Water authority',
  'simple.from': 'Measurement period from',
  'simple.to': 'to (inclusive)',
  'simple.packages': 'Measurement package',
  'simple.compartments': 'Compartment',
  'simple.quantities': 'Quantity or classification',
  'simple.objects': 'Location',
  'simple.objectsHint': '{count} locations of this water authority; type part of the name or code.',
  'simple.objectsNeedOrganisation': 'Choose a water authority first.',
  'simple.parameters': 'Taxon or parameter',
  'simple.parametersHint': 'Type at least 2 characters, for example "galium" or a substance code such as "Cd". A taxon includes variants such as [1], [2] and subspecies.',
  'simple.placeholder': 'Click to choose or type to search…',
  'simple.searchPlaceholder': 'Type to search…',
  'simple.more': 'Showing {shown} of {total}, type to narrow down',
  'simple.noMatches': 'No matches',
  'simple.searching': 'Searching…',
  'simple.loading': 'Loading list…',
  'simple.loadFailed': 'The list could not be loaded.',
  'simple.remove': 'Remove',
  'simple.count': '{count} observations found',
  'simple.counting': 'Counting observations…',
  'simple.countNeedsOrganisation': 'Choose a water authority to start.',
  'simple.countFailed': 'Could not count the observations: {reason}',
  'simple.show': 'SHOW RESULTS',
  'simple.showTitle': 'Shows the first 100 observations in a table',
  'simple.fetchAll': 'FETCH ALL',
  'simple.fetchAllTitle': 'Fetches all observations (up to the maximum); you can then download them as CSV',
  'simple.clear': 'CLEAR ALL',
  'simple.where': 'Where',
  'simple.when': 'When',
  'simple.what': 'What',
  'list.moreChips': '+{count} more',
  'list.selectGroup': 'Choose the whole group ({count})',
  'list.groupToggle': 'Choose or clear the whole group',
  'dialog.open': 'All options in a large window',
  'dialog.search': 'Search by name or code',
  'dialog.matches': '{count} options',
  'dialog.selectAll': 'Select all {count}',
  'dialog.selected': 'Chosen ({count})',
  'dialog.noneSelected': 'Nothing chosen yet. Tick options in the list.',
  'dialog.clear': 'Clear all',
  'dialog.cancel': 'Cancel',
  'dialog.apply': 'Apply ({count})',
  'codes.title': 'Code lists',
  'codes.intro': 'This shows which codes this service knows, such as water authorities, locations, measurement packages, quantities and taxa. Choose a list on the left; search it, view details, download it as CSV, or search observations with a code right away.',
  'codes.lists': 'Code lists',
  'codes.searchLists': 'Search for a code list',
  'codes.count': '{count}',
  'codes.choose': 'Choose a code list on the left to see its contents.',
  'codes.organisation': 'Water authority',
  'codes.search': 'Search in this list (name or code)',
  'codes.searchServer': 'Search by name (at least 2 characters)',
  'codes.download': 'DOWNLOAD CSV',
  'codes.needsOrganisation': 'This list is kept per water authority. Choose a water authority first.',
  'codes.needsSearch': 'This list is too large to show at once. Type at least 2 characters of the name.',
  'codes.shown': '{shown} of {total} shown.',
  'codes.truncated': 'Only the first {count} were loaded; search to narrow down.',
  'codes.useAll': 'Search observations with these {count}',
  'codes.useOne': 'Search observations with "{name}"',
  'codes.useNetwork': 'Search observations at the {count} locations of this network',
  'codes.details': 'Details',
  'codes.closeDetails': 'Close details',
  'codes.versions': '({count} older versions merged)',
  'list.selectAll': 'Select all {count} matches',
  'list.more': 'Show {count} more',
  'list.recent': 'Recently used',
  'list.noData': 'no data',
  'list.showUnavailable': 'Also show {count} without data for your key',
  'list.hideUnavailable': 'Hide options without data',
  'list.checking': 'Checking availability… {done} of {total}',
  'list.checked': '{count} with data',
  'simple.organisationNoKey': 'Enter your API key to see only water authorities with data.',
  'simple.availabilityHint': 'Options without data at this water authority are greyed out at the bottom.',
  'advanced.title': 'Advanced',
  'advanced.description': 'Custom filters, columns ($select), URL and headers'
};

export const MESSAGES: Record<Lang, Record<string, string>> = { nl: NL, en: EN };

/** Adds or replaces texts, for example from a feature that has its own texts. */
export function registerMessages(extra: Record<Lang, Record<string, string>>): void {
  for (const lang of LANGS) {
    Object.assign(MESSAGES[lang], extra[lang]);
  }
}

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'nl' ? 'nl-NL' : 'en-GB').format(value);
}

/**
 * Returns the text for a key in the given language, with {placeholders} filled in.
 * Falls back to English and then to the key itself, so a missing text is visible
 * but never breaks the page.
 */
export function translate(lang: Lang, key: string, params?: TranslationParams): string {
  const template = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === null || value === undefined) {
      return '';
    }
    return typeof value === 'number' ? formatNumber(value, lang) : value;
  });
}

/** Reads a stored language, or returns the default (Dutch). */
export function parseLang(value: string | null | undefined): Lang {
  return value === 'en' ? 'en' : 'nl';
}
