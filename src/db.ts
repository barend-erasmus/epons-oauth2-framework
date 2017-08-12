// Imports
import * as Sequelize from 'sequelize';
import * as co from 'co';

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
            field: 'UserId',
            allowNull: false,
            type: Sequelize.UUID,
            primaryKey: true
        },
        username: {
            field: 'Username',
            allowNull: false,
            type: Sequelize.STRING,
        },
        password: {
            field: 'Password',
            allowNull: false,
            type: Sequelize.STRING,
        },
    }, {
            timestamps: false,
            freezeTableName: true,
            tableName: '[Credentials]',
            schema: '[User]'
        });

    return sequelize;
}

export function validateCredentials(client_id: string, username: string, password: string): Promise<boolean> {
    const self = this;
    return co(function* () {

        const database = getDatabase();

        yield database.authenticate();

        const userCredentials = yield UserCredentials.find({
            where: {
                username,
                password
            }
        });

        if (userCredentials) {
            return true;
        }

        return false;
    });
}