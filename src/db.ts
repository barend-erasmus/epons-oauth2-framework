// Imports
import * as co from 'co';
import * as moment from 'moment';
import * as Sequelize from 'sequelize';

import * as crypto from 'crypto';
import * as sendgrid from 'sendgrid';

let sequelize: Sequelize.Sequelize = null;
let UserDetails = null;
let UserCredentials = null;

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

export function validateCredentials(clientId: string, username: string, password: string): Promise<boolean> {
    return co(function* () {

        const database = getDatabase();

        yield database.authenticate();

        const userCredentials = yield UserCredentials.find({
            where: {
                locked: false,
                password,
                username,
            },
        });

        if (userCredentials) {

            userCredentials.lastLoginTimestamp = moment().format('YYYY-MM-DD HH:mm:ss');

            userCredentials.save();

            return true;
        }

        return false;
    });
}

export function sendForgotPasswordEmail(clientId: string, username: string, resetPasswordUrl: string) {
    return co(function* () {
        // const domain = 'https://epons-oauth2-framework.openservices.co.za';
        const domain = 'http://localhost:3000';
        const html = `<div> We heard that you lost your EPONS password. Sorry about that!<br><br>But don’t worry! You can use the following link within the next day to reset your password:<br><br><a href="${domain}${resetPasswordUrl}" target="_blank">Reset Password</a><br><br>If you don’t use this link within 3 hours, it will expire.<br><br>Thanks,<br>Your friends at EPONS <div class="yj6qo"></div><div class="adL"><br></div></div>`;

        const database = getDatabase();

        yield database.authenticate();

        const userCredentials = yield UserCredentials.find({
            where: {
                locked: false,
                username,
            },
        });

        if (userCredentials) {
            const userDetails = yield UserDetails.find({
                where: {
                    id: userCredentials.id,
                },
            });

            if (userDetails) {
                yield sendEmail(userDetails.emailAddress, 'EPONS - Forgot Password', html);
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    });
}

export function resetPassword(clientId: string, username: string, password: string): Promise<boolean> {
    return co(function* () {

        const database = getDatabase();

        yield database.authenticate();

        const userCredentials = yield UserCredentials.find({
            where: {
                locked: false,
                username,
            },
        });

        if (userCredentials) {

            userCredentials.password = password;

            userCredentials.save();

            return true;
        }

        return false;
    });
}
