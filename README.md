# TimelineDB
TimelineDB是一个面向node.js的orm数据库操作框架，非完美移植于ThinkPHP 5.0的数据库框架<br>
主要特性包括：<br>
1, 类拆分为Connection（连接器）/Query（查询器）/Builder（SQL生成器）<br>
2, Query对象查询<br>
3, 链式操作<br>
4, 抛弃node.js异步操作，避免Promise回调地狱<br>

使用方法：<br>
1, 补充数据库配置信息（host,user,password,database）<br>
2, 导入./test.sql<br>
3, cnpm install<br>
4, npm run dev<br>