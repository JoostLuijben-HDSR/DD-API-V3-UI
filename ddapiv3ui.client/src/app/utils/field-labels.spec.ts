import { fieldDisplayName, fieldLabel } from './field-labels';

describe('fieldLabel', () => {
  it('knows observation fields', () => {
    expect(fieldLabel('Parameter/MeasurementPackage')).toBe('Meetpakket');
    expect(fieldLabel('Foi/Code')).toBe('Meetobject (code)');
  });

  it('accepts table column names with dots', () => {
    expect(fieldLabel('Parameter.Quantity')).toBe('Grootheid (of typering)');
    expect(fieldLabel('Result.Measure.Uom')).toBe('Eenheid');
  });

  it('returns null for unknown fields', () => {
    expect(fieldLabel('Something/Else')).toBeNull();
  });
});

describe('fieldDisplayName', () => {
  it('shows the Dutch name with the technical name', () => {
    expect(fieldDisplayName('Parameter/MeasurementPackage')).toBe('Meetpakket (Parameter/MeasurementPackage)');
  });

  it('shows only the technical name when both are the same or unknown', () => {
    expect(fieldDisplayName('Code')).toBe('Code');
    expect(fieldDisplayName('Unknown/Field')).toBe('Unknown/Field');
  });
});

describe('field labels in English', () => {
  it('gives English names', () => {
    expect(fieldLabel('Parameter/MeasurementPackage', 'en')).toBe('Measurement package');
    expect(fieldDisplayName('Foi.Code', 'en')).toBe('Measurement object (code) (Foi.Code)');
  });

  it('keeps Dutch as the default', () => {
    expect(fieldLabel('Parameter/MeasurementPackage')).toBe('Meetpakket');
  });
});
