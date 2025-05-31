import { createObjectCsvStringifier } from 'csv-writer';
import * as sax from 'sax';
import { writeFileSync, mkdirSync } from 'fs';
import { format } from 'path';
import { Readable } from 'stream';

type Header = {
  id: string;
  title: string;
};

type Result = {
  header: Header[];
  records: Record<string, string | undefined>[];
};

type Results = {
  [key: string]: Result;
};

type Csvs = {
  [key: string]: string;
};

interface SaxNode {
  name: string;
  attributes: Record<string, string>;
}

export class AppleHealthCareData {
  private results: Results;
  private csvs: Csvs;
  private currentRecord: Record<string, string | undefined> | null;
  private currentKey: string | null;
  private recordCount: number;
  private lastProgressUpdate: number;
  private outputDir: string;
  private batchSize: number;
  private csvWriters: { [key: string]: any };

  constructor(outputDir: string = process.cwd(), batchSize: number = 1000) {
    this.results = {};
    this.csvs = {};
    this.currentRecord = null;
    this.currentKey = null;
    this.recordCount = 0;
    this.lastProgressUpdate = Date.now();
    this.outputDir = outputDir;
    this.batchSize = batchSize;
    this.csvWriters = {};

    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });
  }

  private initializeCsvWriter(key: string, header: Header[]) {
    if (!this.csvWriters[key]) {
      const csvWriter = createObjectCsvStringifier({ header });
      const path = format({ dir: this.outputDir, base: `${key}.csv` });
      // Write header
      writeFileSync(path, csvWriter.getHeaderString()!, 'utf-8');
      this.csvWriters[key] = { writer: csvWriter, path };
    }
  }

  private writeBatch(key: string) {
    if (this.results[key].records.length >= this.batchSize) {
      const { writer, path } = this.csvWriters[key];
      const batch = this.results[key].records.splice(0, this.batchSize);
      const csvString = writer.stringifyRecords(batch);
      writeFileSync(path, csvString, { flag: 'a' });
    }
  }

  async parseXml(xmlStream: Readable): Promise<void> {
    return new Promise((resolve, reject) => {
      const parser = sax.createStream(true, { trim: true });

      // Add error handler for the input stream
      xmlStream.on('error', (err: Error) => {
        parser.end();
        reject(err);
      });

      parser.on('opentag', (node: SaxNode) => {
        if (node.name === 'Record' && node.attributes.type) {
          const match = node.attributes.type.match(/^HK.*TypeIdentifier(.+)$/);
          if (match && match[1]) {
            match[1] = match[1].replace(/^Apple/, '');
          }
          if (!match || match.length === 0) return;

          const key = match[1];
          this.currentKey = key;
          this.currentRecord = {};

          if (!this.results[key]) {
            this.results[key] = { header: [], records: [] };
            const attribKeys = Object.keys(node.attributes);
            for (const k of attribKeys) {
              if (k !== 'type') {
                this.results[key].header.push({ id: k, title: k });
              }
            }
            this.initializeCsvWriter(key, this.results[key].header);
          }

          for (const h of this.results[key].header) {
            this.currentRecord[h.id] = node.attributes[h.id];
          }
        }
      });

      parser.on('closetag', (nodeName: string) => {
        if (nodeName === 'Record' && this.currentRecord && this.currentKey) {
          const key = this.currentKey;
          this.results[key].records.push(this.currentRecord);
          this.currentRecord = null;
          this.currentKey = null;

          // Write batch if we've accumulated enough records
          this.writeBatch(key);

          // Update progress every 1000 records or every 2 seconds
          this.recordCount++;
          const now = Date.now();
          if (this.recordCount % 1000 === 0 || now - this.lastProgressUpdate > 2000) {
            console.info(`Processed ${this.recordCount} records...`);
            this.lastProgressUpdate = now;
          }
        }
      });

      parser.on('error', (err: Error) => {
        xmlStream.destroy();
        reject(err);
      });

      parser.on('end', () => {
        // Only resolve if we haven't already rejected
        if (this.recordCount > 0) {
          // Write any remaining records
          Object.keys(this.results).forEach((key) => {
            if (this.results[key].records.length > 0) {
              const { writer, path } = this.csvWriters[key];
              const csvString = writer.stringifyRecords(this.results[key].records);
              writeFileSync(path, csvString, { flag: 'a' });
              // Don't clear the records so they can be used by writeCsvs
            }
          });

          console.info(`Finished processing ${this.recordCount} records`);
          resolve();
        }
      });

      xmlStream.pipe(parser);
    });
  }

  writeCsvs() {
    console.info('Writing CSV files...');
    const keys = Object.keys(this.results);
    for (const k of keys) {
      console.info(`Writing ${k}.csv (${this.results[k].records.length} records)`);
      const csvWriter = createObjectCsvStringifier({
        header: this.results[k].header,
      });
      this.csvs[k] = csvWriter.getHeaderString() + csvWriter.stringifyRecords(this.results[k].records);
    }
    return this;
  }

  csv(key: string): string {
    return this.csvs[key];
  }

  keys(): string[] {
    return Object.keys(this.results);
  }
}
