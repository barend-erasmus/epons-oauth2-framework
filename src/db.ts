// Imports
import * as co from 'co';
import * as moment from 'moment';
import * as Sequelize from 'sequelize';

let sequelize: Sequelize.Sequelize = null;
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

export function validateCredentials(clientId: string, username: string, password: string): Promise<boolean> {
    const self = this;
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
