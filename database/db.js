import Connection from './connection';
import Query from './query'

class Database {
    // static
    constructor(connection = null){
        this.connection = connection;
        // this.query = new Query();
        this.q = new Query(this)
    }

    getConn(callback){
        if(this.connection == null){
            Connection.getConnFromPool((connection)=>{
                this.connection = connection;
                callback(this.connection)
            })
        }else{
            callback(this.connection)
        }
    }


    async query(query,params){
        return await this.q.query(query,params);
    }

}

let DB = {
    startTrans : async function(){
        let conn = await Connection.getConnection();
        let db = new Database(conn);
        return await new Query(db).startTrans();
    },

    table : function(table){
        let db = new Database();
        return new Query(db).table(table);
    },

    query : async function(query,params,fetchSql = false){
        let db = new Database();
        return await new Query(db).query(query,params,fetchSql);
    },
};

export default DB;

