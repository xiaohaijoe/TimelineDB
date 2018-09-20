import Connection from './database/connection'
let config = {
    host: '119.23.247.121',
    user: 'root',
    password: '19605318b7',
    database: 'test',
};
Connection.initConnection(config);

require('./src/index')

