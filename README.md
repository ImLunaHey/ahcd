# ahcd

Apple Health Care Data convert xml to csv

# Introduction

This is a fork of the original [ahcd](https://github.com/freddiefujiwara/ahcd) project, with significant improvements:

- Rewritten in TypeScript for better type safety and developer experience
- Improved streaming XML parsing for better memory efficiency
- Enhanced error handling and progress reporting
- Better test coverage and CI integration
- Modern build system and package structure

# Features

- Efficient streaming XML parsing for large health data exports
- Memory-efficient processing with batch writing
- Support for all Apple Health data types
- Progress reporting during processing
- Error handling for malformed XML
- TypeScript support for developers

# Installation

## As a CLI tool

Install the command globally:

```bash
$ npm i -g ahcd
```

## As a library

Install as a dependency in your project:

```bash
$ npm i ahcd
```

# Usage

## CLI Usage

```bash
$ ahcd
================================================================================
Apple Health Care Data convert xml to csv

Author     : luna
Homepage   : https://github.com/imlunahey/ahcd#readme
LICENSE    : MIT
Report bugs: https://github.com/imlunahey/ahcd/issues
================================================================================

Usage: ahcd [-h] <file> [-t <type>] [-d <dir>]
```

- The **＜ file ＞** argument must be **export.xml** which I mentioned.
- -t outputs only a specific csv (e.g. -t BodyMass)
- -d specifies the directory to output to (e.g., -d /path/to)

## Library Usage

```typescript
import { AppleHealthCareData } from 'ahcd';
import { createReadStream } from 'fs';

async function processHealthData() {
  const ahcd = new AppleHealthCareData('./output');
  const xmlStream = createReadStream('export.xml');

  // Parse XML and write CSVs
  await ahcd.parseXml(xmlStream);
  ahcd.writeCsvs();

  // Get available data types
  const keys = ahcd.keys();
  console.log('Available data types:', keys);

  // Get CSV content for a specific type
  const heartRateCsv = ahcd.csv('HeartRate');
  console.log('Heart Rate data:', heartRateCsv);
}
```

# Demo

```bash
$ ahcd -d . export.xml
Read export.xml
Analyze export.xml
Wrote . /Height.csv (1 records)
Wrote . /HeartRate.csv (87 records)
Wrote . /BodyMassIndex.csv (50 records)
Wrote . /BloodPressureDiastolic.csv (165 records)
Wrote . /BodyMass.csv (51 records)
Wrote . /BodyFatPercentage.csv (50 records)
Wrote . /FlightsClimbed.csv (1045 records)
Wrote . /BloodPressureSystolic.csv (165 records)
Wrote . /SleepAnalysis.csv (1193 records)
Wrote . /StepCount.csv (12032 records)
Wrote . /DistanceWalkingRunning.csv (13631 records)
```

# Development

## Building from source

```bash
# Clone the repository
git clone https://github.com/imlunahey/ahcd.git
cd ahcd

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

# Contributing

Pull requests are welcome! Please ensure you:

1. Add tests for new features
2. Update documentation
3. Follow the existing code style
4. Run the test suite before submitting

# License

MIT
