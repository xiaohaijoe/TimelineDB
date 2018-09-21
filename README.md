# TimelineDB
TimelineDB是一个面向node.js的orm数据库操作框架，非完美移植于ThinkPHP 5.0的数据库框架<br>
主要特性包括：<br>
1, 类拆分为Connection（连接器）/Query（查询器）/Builder（SQL生成器）<br>
2, Query对象查询<br>
3, 链式操作<br>
4, 抛弃node.js异步操作，避免Promise回调地狱<br>

## 使用方法：<br>
1, 补充数据库配置信息（host,user,password,database）<br>
2, 导入./test.sql<br>
3, cnpm install<br>
4, npm run dev<br>

## 说明文档
https://github.com/xiaohaijoe/TimelineDB/wiki

## 基本使用
### 初始化
```
import Connection from './database/connection'
let config = {
    host: 'xxx.xxx.xxx.xxx',
    user: 'root',
    password: 'xxxxxx',
    database: 'xxxx',
};
Connection.initConnection(config);
```

### 执行sql语句
```
await DB.query('select * from test_user where username = ?', ['hello']);
```

### 查询方法
```
await DB.table('test_user').where('username', 'hello').select();
```

### 插入方法
```
await DB.table('test_user').insert({"username": "hello","password": "123456","add_time": new Date().getTime() / 1000});
```

### 更新方法
```
await DB.table('test_user').where('id', 1).update({"password": "1234422"});
```

### 删除方法
```
await DB.table('test_user').where('username', 'USERNAME').delete();
```

### 事务处理
```
let db = await DB.startTrans();
try {
    await db.table('test_user').find();
    await db.table('test_user').where('username','aaaa').delete();
    await db.commit();
}catch (e) {
    await db.rollback();
}
```
更多说明请查看说明文档。