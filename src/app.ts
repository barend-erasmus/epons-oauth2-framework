// Imports
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as path from 'path';
import * as yargs from 'yargs';

import { Client, OAuth2Framework, OAuth2FrameworkRouter } from 'oauth2-framework';

import { validateCredentials } from './db';

const argv = yargs.argv;
const app = express();

// Configures middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/static', express.static(path.join(__dirname, 'public')));

const framework = new OAuth2Framework({
    findClient: (client_id: string) => {
        if (client_id === '0zyrWYATtw') {
            return Promise.resolve(new Client('0zyrWYATtw', 'x3h8CTB2Cj', [], ['http://localhost:5766/User/Callback', 'http://epons.sadfm.co.za/User/Callback']));
        } else {
            return Promise.resolve(null);
        }
    },
    validateCredentials: validateCredentials,
});

app.use('/', OAuth2FrameworkRouter(framework, path.join(__dirname, 'login.handlebars')));

app.listen(argv.port || 3000, () => {
    console.log(`listening on port ${argv.port || 3000}`);
});


