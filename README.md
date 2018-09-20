# TimelineDB
TimelineDB是一个面向node.js的orm数据库操作框架，非完美移植于ThinkPHP 5.0的数据库框架
主要特性包括：
1, 类拆分为Connection（连接器）/Query（查询器）/Builder（SQL生成器）
2, Query对象查询
3, 链式操作
4, 抛弃node.js异步操作，避免Promise回调地狱

使用方法：
1, 补充数据库配置信息（host,user,password,database）
2, 导入./test.sql
3, cnpm install
4, npm run dev