import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createReadStream, rmSync } from 'fs';
import { AppleHealthCareData } from '../src/AppleHealthCareData';
import { Readable } from 'stream';

describe('AppleHealthCareData', () => {
  let ahcd: AppleHealthCareData;

  beforeEach(() => {
    ahcd = new AppleHealthCareData('__test__/export');
  });

  afterAll(() => {
    // Clean up the test output directory
    rmSync('__test__/export', { recursive: true, force: true });
  });

  it('constructor() can create new instance', () => {
    expect(ahcd).not.toBeNull();
    expect(ahcd).toBeInstanceOf(AppleHealthCareData);
  });

  it('parseXml() can parse XML and create results', async () => {
    const xmlStream = createReadStream('__test__/export.xml');
    await ahcd.parseXml(xmlStream);

    // Test the results through public methods
    const keys = ahcd.keys();
    expect(keys).toContain('HeartRate');
    expect(keys).toContain('BodyMassIndex');
    expect(keys).toContain('BloodPressureSystolic');
    expect(keys).toContain('BloodPressureDiastolic');

    // Test CSV generation
    ahcd.writeCsvs();
    expect(ahcd.csv('HeartRate')).not.toBeUndefined();
    expect(ahcd.csv('BodyMassIndex')).not.toBeUndefined();
    expect(ahcd.csv('BloodPressureSystolic')).not.toBeUndefined();
    expect(ahcd.csv('BloodPressureDiastolic')).not.toBeUndefined();
  });

  it('parseXml() can handle streaming data in chunks', async () => {
    // Create a custom readable stream that emits data in chunks
    const xmlContent = await new Promise<string>((resolve) => {
      const stream = createReadStream('__test__/export.xml');
      let data = '';
      stream.on('data', (chunk) => (data += chunk));
      stream.on('end', () => resolve(data));
    });

    const chunkSize = 100; // Small chunks to test streaming
    const chunks: string[] = [];
    for (let i = 0; i < xmlContent.length; i += chunkSize) {
      chunks.push(xmlContent.slice(i, i + chunkSize));
    }

    const stream = new Readable({
      read() {
        const chunk = chunks.shift();
        if (chunk) {
          this.push(chunk);
        } else {
          this.push(null);
        }
      },
    });

    await ahcd.parseXml(stream);

    // Verify the results are the same as with normal file reading
    const keys = ahcd.keys();
    expect(keys).toContain('HeartRate');
    expect(keys).toContain('BodyMassIndex');
    expect(keys).toContain('BloodPressureSystolic');
    expect(keys).toContain('BloodPressureDiastolic');
  });

  it('parseXml() can handle streaming errors', async () => {
    const errorStream = new Readable({
      read() {
        // Push some data first to ensure the parser is initialized
        this.push('<HealthData>');
        // Then emit the error
        this.emit('error', new Error('Test error'));
      },
    });

    await expect(ahcd.parseXml(errorStream)).rejects.toThrow('Test error');
  });

  it('writeCsvs() can write from results to fill out csvs', async () => {
    const xmlStream = createReadStream('__test__/export.xml');
    await ahcd.parseXml(xmlStream);

    expect(ahcd.writeCsvs).toBeInstanceOf(Function);
    expect(ahcd.writeCsvs()).toBeInstanceOf(AppleHealthCareData);

    const expected = {
      HeartRate: 2,
      BodyMassIndex: 3,
      BloodPressureSystolic: 8,
      BloodPressureDiastolic: 2,
    } as const;

    for (const k of Object.keys(expected)) {
      const key = k as keyof typeof expected;
      const csv = ahcd.csv(key);
      expect(csv).not.toBeUndefined();
      const lines = csv?.split('\n').filter((line) => line.trim().length > 0);
      expect(lines?.length).toEqual(expected[key]);
    }
  });

  it('csv(key) can extract csvs[key]', async () => {
    const xmlStream = createReadStream('__test__/export.xml');
    await ahcd.parseXml(xmlStream);
    ahcd.writeCsvs();

    expect(ahcd.csv).toBeInstanceOf(Function);
    expect(ahcd.csv('HeatRate')).toBeUndefined();
    expect(ahcd.csv('HeartRate')).not.toBeUndefined();
  });

  it('keys() can return all keys', async () => {
    const xmlStream = createReadStream('__test__/export.xml');
    await ahcd.parseXml(xmlStream);
    ahcd.writeCsvs();

    expect(ahcd.keys).toBeInstanceOf(Function);
    expect(ahcd.keys()).toBeInstanceOf(Array);
    expect(ahcd.keys().length).toEqual(4);
  });
});
