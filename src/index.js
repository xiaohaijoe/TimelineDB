import DB from '../database/db'

class Test {

    // 基本使用
    static async query() {
        let res = await DB.query('select * from test_user where username = ?', ['hello']);
        console.log(res);
        res = await DB.query('insert into test_user (username,password) values (?,?)', ['hello', '123456222']);
        console.log(res);
    }

    // 查询数据
    static async search() {
        let row = await DB.table('test_user').where('id', 1).find();
        row = await DB.table('test_user').where('username', 'hello').select();

        row = await DB.table('test_user').where('id', 1).value('username');
        // row = await DB.table('test_user').max('age');
        // row = await DB.table('test_user').avg('age');
        // row = await DB.table('test_user').min('age');
        // row = await DB.table('test_user').sum('age');
        // row = await DB.table('test_user').count('age');
        console.log(row);
    }

    // 添加数据
    static async insert() {
        let insert = {
            "username": "hello",
            "password": "123456",
            "add_time": new Date().getTime() / 1000,
        }
        let res = await DB.table('test_user').insert(insert);
        res = await DB.table('test_user').insertGetId(insert);
        console.log(res);
    }

    // 更新数据
    static async update() {
        let res = await DB.table('test_user').where('id', 1).update({"password": "1234422"});
        // res = await DB.table('test_user').where('id',1).setField('age',32);
        // res = await DB.table('test_user').where('id',1).setInc('age');
        // res = await DB.table('test_user').where('id',1).setInc('age',2);
        // res = await DB.table('test_user').where('id',1).setDec('age',2);
        // res = await DB.table('test_user').where('id',1).inc('age',2).update();
        // res = await DB.table('test_user').where('id',1).dec('age',2).update();
        // res = await DB.table('test_user').where('id',1).exp('username','UPPER(username)').update();    // 不支持
        // res = await DB.table('test_user').where('id',1)
        //     .update({
        //         "username" : ['exp' ,'UPPER(username)']
        //     })  // 支持
        console.log(res)
    }

    // 删除数据
    static async delete() {
        let res = await DB.table('test_user').where('username', 'USERNAME').delete();
        console.log(res);
    }

    // 查询方法
    static async where() {
        // let res = await DB.table('test_user').where('username','like','%hello').where('id',1).find();
        // res = await DB.table('test_user').where('username','like','%hello%').whereOr('age','>',5).find();
        let res = await DB.table('test_user').where('username|nickname', 'like', '%hello%').find();
        // let res = await DB.table('test_user').where('username&nickname','like','%hello%').find();
        console.log(res);
    }

    // 表达式	        含义
    // EQ、=  	        等于（=）
    // NEQ、<>	        不等于（<>）
    // GT、>	大于       （>）
    // EGT、>=	        大于等于（>=）
    // LT、<	小于        （<）
    // ELT、<=	        小于等于（<=）
    // LIKE	            模糊查询
    // [NOT] BETWEEN	（不在）区间查询
    // [NOT] IN	        （不在）IN 查询
    // [NOT] NULL	    查询字段是否（不）是NULL
    // [NOT] EXISTS	    EXISTS查询
    // EXP	            表达式查询，支持SQL语法
    // 以下暂不支持
    // > time	        时间比较
    // < time	        时间比较
    // between time	    时间比较
    // notbetween time	时间比较
    static async whereGram() {
        // let res = await DB.table('test_user').where('age','eq',26).find();
        // let res = await DB.table('test_user').where('age','=',26).find();
        // let res = await DB.table('test_user').where('age','between','2,30').find();
        // let res = await DB.table('test_user').where('age','between',[2,30]).find();
        // let res = await DB.table('test_user').where('nickname','not null').find();
        // let res = await DB.table('test_user').where('age','in','3,24,48').find();
        let res = await DB.table('test_user').where('age', 'exp', 'in(3,24,48)').find();
        console.log(res);
    }

    // 链式操作
    // 数组条件
    static async array() {
        let where = {};
        where['id'] = 1;
        where['username'] = 'hello';
        where['age'] = ['between', '2,50'];
        // 把查询条件传入查询方法
        let res = await DB.table('test_user').where(where).select();
        console.log(res);
    }

    // 字符串查询
    static async string() {
        // 使用字符串条件直接查询和操作
        // let res = await DB.table('test_user').where("age > 1 AND username = 'hello'").find();
        let res = await DB.table('test_user').where("age > :age AND username = :username").bind({
            'age': 4,
            "username": 'hello'
        }).find();
        console.log(res);
    }

    // table方法主要用于指定操作的数据表。
    static async table() {
        // let res = await DB.table('test_user').where('username','hello').find();
        // let res = await DB.table('test_user user, test_score score').where('user.id = score.user_id').select();
        let res = await DB.table({
            "test_user": "user",
            "test_score": "score"
        }).where('user.id = score.user_id').select();

        console.log(res);
    }

    // field方法属于模型的连贯操作方法之一，主要目的是标识要返回或者操作的字段，可以用于查询和写入操作。
    static async field() {
        let res = await DB.table('test_user').field('*').select();
        // let res = await DB.table('test_user').field('username').select();
        // let res = await DB.table('test_user').field('username as name,age').select();
        // let res = await DB.table('test_user').field('id,sum(age)').select();
        // let res = await DB.table('test_user').field({'id': 'id', 'username': 'name', 'age': 'aaa'}).select();
        // let res = await DB.table('test_user').field({'id': 'id', 'concat(username,"-",id)': 'truename', 'LEFT(username,3)': 'sub_name'}).select();
        console.log(res);
    }

    // order方法属于模型的连贯操作方法之一，用于对操作的结果排序。
    static async order() {
        let res = await DB.table('test_user').order('age desc,id asc').select()
        console.log(res);
    }

    // imit方法也是模型类的连贯操作方法之一，主要用于指定查询和操作的数量，特别在分页查询的时候使用较多。
    static async limit() {
        // let res = await DB.table('test_user').where('age','>',5).limit(2).select();
        // 分页查询
        // let res = await DB.table('test_user').where('age','>',5).limit(1,2).select();
        let res = await DB.table('test_user').where('age', '>', 5).limit('1,2').select();
        console.log(res);
    }

    // GROUP方法也是连贯操作方法之一，通常用于结合合计函数，根据一个或多个列对结果集进行分组 。
    // group方法只有一个参数，并且只能使用字符串。
    static async group() {
        let res = await DB.table('test_user').group('username,age').select();
        console.log(res)
    }

    // HAVING方法也是连贯操作之一，用于配合group方法完成从分组的结果中筛选（通常是聚合条件）数据。
    static async having() {
        let res = await DB.table('test_user').field('username,max(age)').group('id').having('count(age)>3').select();
        console.log(res);
    }

    // join通常有下面几种类型，不同类型的join操作会影响返回的数据结果。
    static async join() {
        // let res = await DB.table('test_user a').join('test_score b','a.id = b.user_id').select();
        // let res = await DB.table('test_user a').join('test_score b','a.id = b.user_id','LEFT').select();
        let res = await DB.table('test_user a').leftJoin('test_score b', 'a.id = b.user_id').select();
        console.log(res);
    }

    // UNION操作用于合并两个或多个 SELECT 语句的结果集。
    // 暂不支持
    static async union() {
        let res = await DB.table('test_user_0').field('username').union('select username from test_user_1').select();
        console.log(res);
    }

    // DISTINCT 方法用于返回唯一不同的值 。
    static async distinct() {
        let res = await DB.table('test_user').distinct(true).field('username').select();
        console.log(res);
    }

    // Lock方法是用于数据库的锁机制，如果在查询或者执行操作的时候使用：
    static async lock() {
        let res = await DB.table('test_user').where('id', 1).lock(true).find();
        console.log(res);
    }

    // cache方法用于查询缓存操作，也是连贯操作方法之一。
    // 暂不支持
    static async cache() {

    }

    static async comment() {
        let res = await DB.table('test_user').comment('哈哈哈哈')
            .select();
        console.log(res);
    }

    // fetchSql用于直接返回SQL而不是执行查询，适用于任何的CURD操作方法。
    static async fetchSql() {
        // let res = await DB.table('test_user').fetchSql().select();
        // let res = await DB.table('test_user').fetchSql().insert({"username":"xiaoming"});
        // let res = await DB.table('test_user').where('id',1).fetchSql().update({"username":"xiaoming"});
        let res = await DB.table('test_user').where('id', 1).fetchSql().delete();
        console.log(res);
    }

    // force 方法用于数据集的强制索引操作
    static async force() {
        let res = await DB.table('test_user').force('id').select();
        console.log(res);
    }

    static async bind() {
        // let res = await DB.table('test_user').where("age > :age AND username = :username").bind({
        //     'age': 4,
        //     "username": 'hello'
        // }).select();
        let res = await DB.table('test_user').where('id', ':id').bind({"id": 4}).select();
        console.log(res)
    }

    // 高级查询
    static async seniorWhere() {
        // 快捷查询方式是一种多字段相同查询条件的简化写法，可以进一步简化查询条件的写法，在多个字段之间用|分割表示OR查询，用&分割表示AND查询，可以实现下面的查询
        // let res = await DB.table('test_user').where('username|nickname','like','%hello%').where('add_time&password','>',0).find();
        // 可以进行多个条件的批量条件查询定义，
        let res = await DB.table('test_user')
            .where({
                "username": ['like', '%hello'],
                "age": ['>', 0],
            })
            .find();
        console.log(res);
    }

    // 使用事务处理的话，需要数据库引擎支持事务处理。比如 MySQL 的 MyISAM 不支持事务处理，需要使用 InnoDB 引擎。
    static async transaction(){
        let db = await DB.startTrans();
        try {
            await db.table('test_user').find();
            await db.table('test_user').where('username','aaaa').delete();
            await db.commit();
        }catch (e) {
            await db.rollback();
        }
    }


}

Test.query();