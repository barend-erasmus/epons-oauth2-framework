// Imports
import * as express from 'express';
import * as moment from 'moment';
import * as Sequelize from 'sequelize';
import * as uuid from 'uuid';

import * as crypto from 'crypto';
import * as sendgrid from 'sendgrid';

import * as jsonwebtoken from 'jsonwebtoken';

import { Token as OAuth2FrameworkToken } from 'oauth2-framework';

let sequelize: Sequelize.Sequelize = null;
let UserDetails = null;
let UserCredentials = null;
let AuthEvent = null;

function getDatabase(): Sequelize.Sequelize {

    if (sequelize) {
        return sequelize;
    }
    sequelize = new Sequelize('SADFM_Live', 'username', 'password', {
        dialect: 'mssql',
        host: 'epons.dedicated.co.za',
        pool: {
            idle: 10000,
            max: 5,
            min: 0,
        },
    });

    UserDetails = sequelize.define('UserDetails', {
        emailAddress: {
            allowNull: false,
            field: 'EmailAddress',
            type: Sequelize.STRING,
        },
        id: {
            allowNull: false,
            field: 'UserId',
            primaryKey: true,
            type: Sequelize.UUID,
        },
    }, {
            freezeTableName: true,
            schema: '[User]',
            tableName: '[Details]',
            timestamps: false,
        });

    UserCredentials = sequelize.define('UserCredentials', {
        id: {
            allowNull: false,
            field: 'UserId',
            primaryKey: true,
            type: Sequelize.UUID,
        },
        lastLoginTimestamp: {
            allowNull: false,
            field: 'LastLoginTimestamp',
            type: Sequelize.STRING,
        },
        locked: {
            allowNull: false,
            field: 'Locked',
            type: Sequelize.BOOLEAN,
        },
        password: {
            allowNull: false,
            field: 'Password',
            type: Sequelize.STRING,
        },
        username: {
            allowNull: false,
            field: 'Username',
            type: Sequelize.STRING,
        },
    }, {
            freezeTableName: true,
            schema: '[User]',
            tableName: '[Credentials]',
            timestamps: false,
        });

    AuthEvent = sequelize.define('AuthEvent', {
        extraDetails: {
            allowNull: true,
            field: 'ExtraDetails',
            type: Sequelize.BOOLEAN,
        },
        id: {
            allowNull: false,
            field: 'AuthEventId',
            primaryKey: true,
            type: Sequelize.UUID,
        },
        timestamp: {
            allowNull: false,
            field: 'Timestamp',
            type: Sequelize.STRING,
        },
        type: {
            allowNull: false,
            field: 'Type',
            type: Sequelize.STRING,
        },
        username: {
            allowNull: false,
            field: 'Username',
            type: Sequelize.STRING,
        },
    }, {
            freezeTableName: true,
            schema: '[User]',
            tableName: '[AuthEvent]',
            timestamps: false,
        });

    return sequelize;
}

function sendEmail(toEmailAddress: string, subject: string, html: string): Promise<boolean> {
    return new Promise((resolve, reject) => {

        const sendGridApiKey = '260a5841eef8050867e5fcf789494744a5d19f3729b7e20003d06e0c96fb70d888cd2d5ac7ba24253051229fa45156a31185676abf6b40e14b7515313340784a8915e1472f';

        const cipher = crypto.createDecipher('aes-256-ctr', 'BKReoyqSRE');
        let decryptedToken = cipher.update(sendGridApiKey, 'hex', 'utf8');
        decryptedToken += cipher.final('utf8');

        const helper = sendgrid.mail;

        const content = new helper.Content('text/html', html);
        const mail = new helper.Mail(new helper.Email('noreply@developersworkspace.co.za'), subject, new helper.Email(toEmailAddress), content);

        const sg = sendgrid(decryptedToken);
        const request = sg.emptyRequest({
            body: mail.toJSON(),
            method: 'POST',
            path: '/v3/mail/send',
        });

        sg.API(request, (response: any) => {
            resolve(true);
        });

    });
}

export async function validateCredentials(clientId: string, username: string, password: string, request: express.Request): Promise<boolean> {
    const database = getDatabase();

    await database.authenticate();

    const userCredentials = await UserCredentials.find({
        where: {
            locked: false,
            password,
            username,
        },
    });

    if (userCredentials) {

        userCredentials.lastLoginTimestamp = moment().format('YYYY-MM-DD HH:mm:ss');

        userCredentials.save();

        await AuthEvent.create({
            extraDetails: null,
            id: uuid.v4(),
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            type: 'validateCredentials',
            username,
        });

        return true;
    }

    return false;
}

export async function sendForgotPasswordEmail(clientId: string, username: string, resetPasswordUrl: string, request: express.Request) {
    const domain = 'https://epons-oauth2-framework.openservices.co.za';
    // const domain = 'http://localhost:3000';
    const html = `<div> We heard that you lost your EPONS password. Sorry about that!<br><br>But don’t worry! You can use the following link within the next day to reset your password:<br><br><a href="${domain}${resetPasswordUrl}" target="_blank">Reset Password</a><br><br>If you don’t use this link within 3 hours, it will expire.<br><br>Thanks,<br>Your friends at EPONS <div class="yj6qo"></div><div class="adL"><br></div></div>`;

    const database = getDatabase();

    await database.authenticate();

    const userCredentials = await UserCredentials.find({
        where: {
            locked: false,
            username,
        },
    });

    if (userCredentials) {
        const userDetails = await UserDetails.find({
            where: {
                id: userCredentials.id,
            },
        });

        if (userDetails) {
            await sendEmail(userDetails.emailAddress, 'EPONS - Forgot Password', html);

            await AuthEvent.create({
                extraDetails: null,
                id: uuid.v4(),
                timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
                type: 'sendForgotPasswordEmail',
                username,
            });

            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

export async function resetPassword(clientId: string, username: string, password: string, request: express.Request): Promise<boolean> {
    const database = getDatabase();

    await database.authenticate();

    const userCredentials = await UserCredentials.find({
        where: {
            locked: false,
            username,
        },
    });

    if (userCredentials) {

        userCredentials.password = password;

        userCredentials.save();

        await AuthEvent.create({
            extraDetails: null,
            id: uuid.v4(),
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            type: 'resetPassword',
            username,
        });

        return true;
    }

    return false;
}

export async function generateCode(clientId: string, username: string, scopes: string[], request: express.Request): Promise<string> {

    const code: string = jsonwebtoken.sign({
        clientId,
        scopes,
        type: 'code',
        username,
    }, 'xtnowfPid3', {
            expiresIn: '10m',
        });

    await AuthEvent.create({
        extraDetails: code,
        id: uuid.v4(),
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        type: 'generateCode',
        username,
    });

    return code;
}

export async function validateCode(code: string, request: express.Request): Promise<OAuth2FrameworkToken> {
    const token: any = await decodeJWT(code);

    if (!token) {
        return null;
    }

    if (token.type !== 'code') {
        return null;
    }

    return new OAuth2FrameworkToken(token.clientId, token.username, token.scopes);
}

export async function generateAccessToken(clientId: string, username: string, scopes: string[], request: express.Request): Promise<string> {
    const accessToken = jsonwebtoken.sign({
        clientId,
        scopes,
        type: 'access-token',
        username,
    }, 'xtnowfPid3', {
            expiresIn: '60m',
        });

    await AuthEvent.create({
        extraDetails: accessToken,
        id: uuid.v4(),
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        type: 'generateAccessToken',
        username,
    });

    return accessToken;
}

export async function validateAccessToken(accessToken: string, request: express.Request): Promise<OAuth2FrameworkToken> {
    const token: any = await decodeJWT(accessToken);

    if (!token) {
        return null;
    }

    if (token.type !== 'access-token') {
        return null;
    }

    return new OAuth2FrameworkToken(token.clientId, token.username, token.scopes);
}

function decodeJWT(jwt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        jsonwebtoken.verify(jwt, 'xtnowfPid3', (err: Error, decodedCode: any) => {

            if (err) {
                resolve(null);
                return;
            }

            resolve(decodedCode);
        });
    });
}
