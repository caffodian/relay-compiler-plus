import yargs from 'yargs';
import 'babel-polyfill';
import path from 'path';
import fs from 'fs';
import RelayCompiler from 'relay-compiler';
import {getFilepathsFromGlob, getRelayFileWriter, getSchema} from './ripped';
import {clean} from './utils';
import {graphqlJSCompiler} from 'relay-compiler-plus/graphqlJSCompiler'; //eslint-disable-line
import {queryMap, persistQuery} from './persistQuery';

const {
  ConsoleReporter,
  Runner: CodegenRunner,
  FileIRParser: RelayJSModuleParser,
} = RelayCompiler;

/*
* Most of the code in this run method are ripped from:
* relay-compiler/bin/RelayCompilerBin.js
*/
const run = async (options: { schema: string, src: string, webpackConfig: string }) => {
  const srcDir = path.resolve(process.cwd(), options.src);
  console.log(`src: ${srcDir}`);

  let schemaPath;
  let customWebpackConfig;

  if (options.webpackConfig) {
    customWebpackConfig = path.resolve(process.cwd(), options.webpackConfig);
  } else {
    schemaPath = path.resolve(process.cwd(), options.schema);
  }

  if ((schemaPath && path.extname(schemaPath) === '.js') || customWebpackConfig) {
    console.log(`schemaPath: ${schemaPath}, customWebpackConfig: ${customWebpackConfig}`);
    schemaPath = await graphqlJSCompiler(schemaPath, srcDir, customWebpackConfig);
  }

  console.log(`schemaPath: ${schemaPath}`);

  clean(srcDir);

  const reporter = new ConsoleReporter({verbose: true});
  const parserConfigs = {
    default: {
      baseDir: srcDir,
      getFileFilter: RelayJSModuleParser.getFileFilter,
      getParser: RelayJSModuleParser.getParser,
      getSchema: () => getSchema(schemaPath),
      filepaths: getFilepathsFromGlob(srcDir, {
        extensions: ['js'],
        include: ['**'],
        exclude: [
          '**/node_modules/**',
          '**/__mocks__/**',
          '**/__tests__/**',
          '**/__generated__/**',
        ],
      }),
    },
  };
  const writerConfigs = {
    default: {
      getWriter: getRelayFileWriter(srcDir, persistQuery),
      isGeneratedFile: (filePath) =>
        filePath.endsWith('.js') && filePath.includes('__generated__'),
      parser: 'default',
    },
  };
  const codegenRunner = new CodegenRunner({
    reporter,
    parserConfigs,
    writerConfigs,
    onlyValidate: false,
  });

  let result = '';
  try {
    // the real work is done here
    result = await codegenRunner.compileAll();
  } catch (err) {
    console.log(`Error codegenRunner.compileAll(): ${err}`);
    throw err;
  }

  const queryMapOutputFile = `${srcDir}/queryMap.json`;
  try {
    fs.writeFileSync(queryMapOutputFile, JSON.stringify(queryMap));
    console.log(`Query map written to: ${queryMapOutputFile}`);
  } catch (err) {
    if (err) {
      return console.log(err);
    }
  }

  console.log(`Done! ${result}`);
};

// Collect args
const argv = yargs // eslint-disable-line prefer-destructuring
  .usage('Usage: $0 --schema <schemaPath> --src <srcDir>')
  .options({
    schema: {
      describe: 'Path to schema.js or schema.graphql or schema.json',
      demandOption: false,
      type: 'string',
    },
    src: {
      describe: 'Root directory of application code',
      demandOption: true,
      type: 'string',
    },
    webpackConfig: {
      describe: 'Custom webpack config to compile graphql-js',
      demandOption: false,
      type: 'string',
    },
  })
  .help().argv;

(async () => {
  console.log('Welcome to relay-compiler-plus. Compiling now with these parameters:');
  try {
    await run(argv);
  } catch (err) {
    console.log(`error: ${err}`);
    process.exit(1);
  }
})();