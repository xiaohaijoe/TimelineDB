import mysql from 'mysql';

// 如果安装了config-lite，可以移除下面两行
// const config = require('config-lite')(__dirname);
// let conf = config.mysql;

let pool = null;

let initConnection = function () {
    if (pool == null) {
        pool = mysql.createPool(conf);
    }
}

let Connection = {
    initConnection: function (conf) {
        if (pool == null) {
            pool = mysql.createPool(conf);
        }
    },
    getConnection: async function () {
        initConnection();
        return new Promise(resolve => {
            return pool.getConnection((err, connection) => {
                resolve(connection);
            });
        })
    },

    getConnFromPool: function (callback) {
        initConnection();
        pool.getConnection((err, connection) => {
            callback(connection);
        })
    },
};
export default Connection;