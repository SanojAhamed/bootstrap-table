import fs from 'fs';
import chalk from 'chalk';
import Constants from '../src/constants/index.js';

let errorSum = 0;
const exampleFilesFolder = './bootstrap-table-examples/';
const exampleFilesFound = fs.existsSync(exampleFilesFolder);
let exampleFiles = [];

// Load example files if the directory exists
if (exampleFilesFound) {
  exampleFiles = [
    ...fs.readdirSync(exampleFilesFolder + 'welcomes'),
    ...fs.readdirSync(exampleFilesFolder + 'options'),
    ...fs.readdirSync(exampleFilesFolder + 'column-options'),
    ...fs.readdirSync(exampleFilesFolder + 'methods')
  ];
} else {
  console.log(chalk.yellow.bold('Warning: Cant check if example files are correctly formatted and have valid URLs.'));
  console.log(chalk.yellow('Warning: To enable this check, please clone the "bootstrap-table-examples" repository in the tools folder or create a symlink (if you already cloned the repository in another path).'));
}

// Base API class
class API {
  constructor() {
    this.init();
    this.sortOptions();
    this.check();
  }

  sortOptions() {
    this.options.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  check() {
    const file = `../site/docs/api/${this.file}`;
    const md = {};
    const content = fs.readFileSync(file).toString();
    const lines = content.split('## ');
    const outLines = lines.slice(0, 1);
    const errors = [];
    const exampleRegex = /\[.*\]\(.*\/(.*\.html)\)/m;
    const attributeRegex = /\*\*Attribute:\*\*\s`(.*)data-(.*)`/m;

    for (const item of lines.slice(1)) {
      md[item.split('\n')[0]] = item;
    }

    console.log('-------------------------');
    console.log(`Checking file: ${file}`);
    console.log('-------------------------');

    // Check for missing options
    const noDefaults = Object.keys(md).filter(it => !this.options.includes(it));

    if (noDefaults.length) {
      errorSum += noDefaults.length;
      console.log(chalk.red(`No default option was found for "${noDefaults.join(', ')}". Should the documentation be removed!`));
      return;
    }

    // Validate options
    for (const [i, key] of this.options.entries()) {
      try {
        if (md[key]) {
          outLines.push(md[key]);
          const details = md[key].split('\n\n- ');

          for (let i = 0; i < this.attributes.length; i++) {
            const name = this.attributes[i];
            const tmpDetails = details[i + 1]?.trim(); // Optional chaining to avoid errors

            if (this.ignore && this.ignore[key] && this.ignore[key].includes(name)) {
              continue;
            }

            // Validate examples
            if (name === 'Example' && exampleFilesFound) {
              const matches = exampleRegex.exec(tmpDetails);
              if (!matches) {
                errors.push(chalk.red(`[${key}] missing or incorrectly formatted example`, `"${tmpDetails}"`));
                continue;
              }

              if (!exampleFiles.includes(matches[1])) {
                errors.push(chalk.red(`[${key}] example '${matches[1]}' could not be found`));
              }
            } 
            // Validate attributes
            else if (name === 'Attribute' && key !== 'columns') {
              const attributeMatches = attributeRegex.exec(tmpDetails);
              if (!attributeMatches) {
                errors.push(chalk.red(`[${key}] missing or incorrectly formatted attribute`, `"${tmpDetails}"`));
                continue;
              }
            }

            // Check for missing details
            if (!tmpDetails || !tmpDetails.includes(`**${name}:**`)) {
              errors.push(chalk.red(`[${key}] missing '${name}'`));
            }
          }
        } else {
          errors.push(chalk.red(`[${key}] option could not be found`));
        }
      } catch (ex) {
        console.error(chalk.red(`[${key}] error processing: ${ex.message}`));
      }
    }

    // Log errors
    errorSum += errors.length;
    if (errors.length > 0) {
      errors.forEach((error) => {
        console.log(error);
      });
    }

    // Write output back to file
    fs.writeFileSync(file, outLines.join('## '));
  }
}

// Subclasses for different types of documentation
class TableOptions extends API {
  init() {
    this.file = 'table-options.md';
    this.options = Object.keys(Constants.DEFAULTS).filter(it => !/^(on|format)[A-Z]/.test(it));
    this.options.unshift('-');
    this.attributes = ['Attribute', 'Type', 'Detail', 'Default', 'Example'];
    this.ignore = {
      totalRows: ['Example'],
      totalNotFiltered: ['Example'],
      virtualScrollItemHeight: ['Example']
    };
  }
}

class ColumnOptions extends API {
  init() {
    this.file = 'column-options.md';
    this.options = Object.keys(Constants.COLUMN_DEFAULTS);
    this.attributes = ['Attribute', 'Type', 'Detail', 'Default', 'Example'];
  }
}

class Methods extends API {
  init() {
    this.file = 'methods.md';
    this.options = Constants.METHODS;
    this.attributes = ['Parameter', 'Detail', 'Example'];
  }
}

class Events extends API {
  init() {
    this.file = 'events.md';
    this.options = Object.values(Constants.EVENTS);
    this.attributes = ['jQuery Event', 'Parameter', 'Detail'];
  }
}

class Localizations extends API {
  init() {
    this.file = 'localizations.md';
    this.options = Object.keys(Constants.LOCALES.en);
    this.attributes = ['Parameter', 'Default'];
  }
}

// Instantiate classes to perform checks
new TableOptions();
new ColumnOptions();
new Methods();
new Events();
new Localizations();

// Exit with appropriate status
if (errorSum === 0) {
  console.log('Good job! Everything is up to date!');
  process.exit(0);
}

process.exit(1);
