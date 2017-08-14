// http://localhost:3000/authorize?response_type=code&client_id=0zyrWYATtw&redirect_uri=http://localhost:5766/User/Callback&state=15791d08-0dba-4ed4-930f-98e92952f7ed

// Imports
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as expressWinston from 'express-winston';
import * as path from 'path';
import * as yargs from 'yargs';

// Imports logger
import { logger } from './logger';

import { Client, OAuth2FrameworkRouter } from 'oauth2-framework';

import { resetPassword, sendForgotPasswordEmail, validateCredentials } from './db';

const argv = yargs.argv;
const app = express();

app.set('trust proxy', true);

// Configures middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(expressWinston.logger({
    meta: true,
    msg: 'HTTP Request: {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}} {{req.ip}}',
    winstonInstance: logger,
}));

app.use('/', OAuth2FrameworkRouter(
    {
        findClient: (clientId: string) => {
            if (clientId === '0zyrWYATtw') {
                return Promise.resolve(new Client('EPONS', '0zyrWYATtw', 'x3h8CTB2Cj', [], ['http://localhost:5766/User/Callback', 'http://epons.sadfm.co.za/User/Callback'], true));
            } else {
                return Promise.resolve(null);
            }
        },
        resetPassword,
        sendForgotPasswordEmail,
        validateCredentials
    },
    path.join(__dirname, 'views/login.handlebars'),
    path.join(__dirname, 'views/forgot-password.handlebars'),
    path.join(__dirname, 'views/forgot-password-success.handlebars'),
    path.join(__dirname, 'views/forgot-password-failure.handlebars'),
    path.join(__dirname, 'views/reset-password.handlebars'),
));

app.listen(argv.port || 3000, () => {
    logger.info(`listening on port ${argv.port || 3000}`);
});
