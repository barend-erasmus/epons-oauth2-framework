// Imports
import * as path from 'path';
import * as winston from 'winston';
import * as yargs from 'yargs';

const argv = yargs.argv;

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ level: 'debug' }),
    new (winston.transports.File)({
      filename: path.join(argv.prod? '/logs/' : './', 'epons-oauth2-framework.log'),
      level: 'debug',
    }),
  ],
});

// Exports
export { logger };