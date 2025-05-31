import { createReadStream, existsSync, mkdirSync } from 'fs';
import minimist from 'minimist';
import pkg from '../package.json';
import { AppleHealthCareData } from './AppleHealthCareData';

const argv = minimist(process.argv.slice(2));

if (argv._.length < 1 || argv.h) {
  console.error('================================================================================');
  console.error(pkg.description);
  console.error('');
  console.error(`Author     : ${pkg.author.name} <${pkg.author.email}> ${pkg.author.url}`);
  console.error(`Homepage   : ${pkg.homepage}`);
  console.error(`LICENSE    : ${pkg.license}`);
  console.error(`Report bugs: ${pkg.bugs.url}`);
  console.error('================================================================================');
  console.error('');
  console.error('Usage: ahcd [-h] <file> [-t <type>] [-d <dir>]');
  console.error('');
  process.exit(1);
}

async function main() {
  const startTime = Date.now();
  try {
    // Set output directory
    const dir = argv.d || `${process.cwd()}/export`;

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Create instance and parse XML
    console.info(`Starting to process ${argv._[0]}`);
    const ahcd = new AppleHealthCareData(dir);
    const xmlStream = createReadStream(argv._[0]);

    console.info('Beginning XML parsing...');
    await ahcd.parseXml(xmlStream);
    const parseTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.info(`XML parsing completed in ${parseTime} seconds`);

    const keys = ahcd.keys();
    console.info(`Found ${keys.length} data types exported`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.info(`\nExport completed in ${totalTime} seconds`);
  } catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
  }
}

main();
