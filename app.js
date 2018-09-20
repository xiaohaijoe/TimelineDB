import Connection from './database/connection'
let config = {
    host: 'xxx.xxx.xxx.xxx',
    user: 'root',
    password: 'xxxxxx',
    database: 'xxxx',
};
Connection.initConnection(config);

require('./src/index')

