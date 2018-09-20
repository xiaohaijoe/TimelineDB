import DB from './db';
import Builder from './builder'
import Util from './util'

class Query {

    constructor(db = null) {
        this.db = db;
        this.builder = new Builder();
        this.builder.setQuery(this);
        this.options = [];
        this.mBind = [];
        this.info = []; // 数据表信息
        this.isTrans = false;
        this.prefix = '';
    }

    table(table){
        this.options['table'] = table;
        return this;
    }

    // Table("tl_user")
    // Table("tl_user a")
    // Table("tl_user a, tl_xxx b")
    // Table("tl_user , tl_xxx b")
    setTable(table) {
        this.options['table'] = table;
        return this;
    }

    /**
     * 得到当前或者指定名称的数据表
     * @access public
     * @return string
     */
    getTable(){
        return this.options['table'] == null ? '' : this.options['table'];
    }

    async select(cls = null) {
        return new Promise(resolve => {
            this.db.getConn((connection) => {
                this.builder.setConnection(connection);
                let query = this.builder.buildSelectSql(this.options);
                if (query.length === 0) {
                    throw new Error("query is empty!");
                }
                let bind = this.getBind();

                let that = this;
                query = this.builder.getRealWhereSql(query,bind);
                if(this.options['fetch_sql']){
                    let sql = connection.format(query,[])
                    resolve(sql);
                    if(!that.isTrans){
                        connection.release();
                    }
                    return;
                }
                connection.query(query, [], function (err, res) {
                    console.log(query);
                    if(res == null){
                        resolve(res);
                    }else{
                        resolve(that.convertToModel(res,cls));
                    }
                    if(!that.isTrans){
                        connection.release();
                    }
                })
            })
        });
    }

    async find(cls = null) {
        return new Promise(resolve => {
            this.db.getConn((connection)=>{
                this.options['limit'] = 1;
                this.builder.setConnection(connection);
                let query = this.builder.buildSelectSql(this.options);
                if (query.length === 0) {
                    throw new Error("query is empty!");
                }
                let bind = this.getBind();

                let that = this;
                query = this.builder.getRealWhereSql(query,bind);
                if(this.options['fetch_sql']){
                    let sql = connection.format(query,[])
                    resolve(sql);
                    if(!that.isTrans){
                        connection.release();
                    }
                    return;
                }
                connection.query(query, [], function (err, res) {
                    console.log(query);
                    if(res == null){
                        resolve(res);
                    }else{
                        resolve(that.convertToModel(res[0],cls));
                    }
                    if(!that.isTrans){
                        connection.release();
                    }

                })
            });
        });
    }

    convertToModel(row,cls = null){
        if(cls == null){
            return row;
        }
        if(row instanceof Array){
            let list = [];
            for(let i in row){
                let obj = row[i]
                list.push(this.convertObject(obj,cls));
            }
            return list;
        }else if(typeof row === 'object'){
            return this.convertObject(row,cls);
        }
        return row
    }

    convertObject(obj,cls){
        let model = new cls();
        for(let key in model){
            let dbKey = model[key];
            model[key] = obj[dbKey];
        }
        return model;
    }

    /**
     * COUNT查询
     * @access public
     * @param string $field 字段名
     * @return integer|string
     */
    async count(field = '*')
    {
        return await this.value('COUNT(' + field + ') AS tl_count', 0, true,'tl_count');
    }

    /**
     * SUM查询
     * @access public
     * @param string $field 字段名
     * @return float|int
     */
    async sum(field)
    {
        return await this.value('SUM(' + field + ') AS tl_sum', 0, true,'tl_sum');
    }

    /**
     * MIN查询
     * @access public
     * @param string $field 字段名
     * @param bool   $force   强制转为数字类型
     * @return mixed
     */
    async min(field, force = true)
    {
        return await this.value('MIN(' + field + ') AS tl_min', 0, force,'tl_min');
    }

    /**
     * MAX查询
     * @access public
     * @param string $field 字段名
     * @param bool   $force   强制转为数字类型
     * @return mixed
     */
    async max(field, force = true)
    {
        return await this.value('MAX(' + field + ') AS tl_max', 0, force,'tl_max');
    }

    /**
     * AVG查询
     * @access public
     * @param string $field 字段名
     * @return float|int
     */
    async avg(field)
    {
        return await this.value('AVG(' + field + ') AS tl_avg', 0, true,'tl_avg');
    }

    /**
     * 得到某个字段的值
     * @access public
     * @param string $field   字段名
     * @param mixed  $default 默认值
     * @param bool   $force   强制转为数字类型
     * @return mixed
     */
    async value(field,defaultVal = null,force = false,key = field)
    {
        let res = false
        this.options['field'] = null;
        let pdo = await this.field(field).limit(1).select();

        if (typeof pdo === 'string') {
            // 返回SQL语句
            return pdo;
        }
        let result = pdo[0][key];
        if (force) {
            result += 0;
        }
        return null !== result ? result : defaultVal;
    }


    async insert(data){
        return new Promise(resolve => {
            this.db.getConn((connection)=>{
                this.builder.setConnection(connection);
                data = Util.mergeArray(this.options['data'], data);
                let sql = this.builder.buildInsertSql(data,this.options);
                let bind = this.getBind();
                let param = [];
                for(let k in bind){
                    param.push(bind[k][0])
                }

                let that = this
                if(this.options['fetch_sql']){
                    let realSql = connection.format(sql,param)
                    resolve(realSql);
                    if(!that.isTrans){
                        connection.release();
                    }
                    return;
                }
                connection.query(sql,param,function(err,res){
                    console.log(sql,param);
                    if(res != null){
                        resolve(res['affectedRows']);
                    }else{
                        resolve(res);
                    }
                    if(!that.isTrans){
                        connection.release();
                    }
                })
            })
        })
    }

    async insertGetId(data){

        return new Promise(resolve => {
            this.db.getConn((connection)=>{
                // 分析查询表达
                this.builder.setConnection(connection);
                data = Util.mergeArray(this.options['data'], data);
                let sql = this.builder.buildInsertSql(data,this.options);
                let bind = this.getBind();
                let param = [];
                for(let k in bind){
                    param.push(bind[k][0])
                }

                let that = this;
                if(this.options['fetch_sql']){
                    let realSql = connection.format(sql,param)
                    resolve(realSql);
                    if(!that.isTrans){
                        connection.release();
                    }
                    return;
                }
                connection.query(sql,param,function(err,res){
                    console.log(sql,param);
                    if(res != null){
                        resolve(res['insertId']);
                    }else{
                        resolve(res);
                    }
                    if(!that.isTrans){
                        connection.release();
                    }
                })
            });
        })
    }

    async update(data){
        return new Promise(resolve => {
            this.db.getConn((connection)=>{
                this.builder.setConnection(connection);
                data =  Util.mergeArray(this.options['data'], data);
                let sql = this.builder.buildUpdateSql(data, this.options);
                // 获取参数绑定
                let bind = this.getBind();
                let param = [];
                for(let k in bind){
                    param.push(bind[k][0])
                }

                let that = this;
                if(this.options['fetch_sql']){
                    let realSql = connection.format(sql,param)
                    resolve(realSql);
                    if(!that.isTrans){
                        connection.release();
                    }
                    return;
                }
                connection.query(sql,param,function(err,res){
                    console.log(sql,param);
                    if(res != null){
                        resolve(res['affectedRows']);
                    }else{
                        resolve(res);
                    }
                    if(!that.isTrans){
                        connection.release();
                    }
                })
            })

        })
    }

    async delete(){

        return new Promise(resolve => {
            this.db.getConn((connection)=>{
                this.builder.setConnection(connection);
                let sql = this.builder.buildDeleteSql(this.options);
                // 获取参数绑定
                let bind = this.getBind();
                let param = [];
                for(let k in bind){
                    param.push(bind[k][0])
                }

                let that = this;
                if(this.options['fetch_sql']){
                    let realSql = connection.format(sql,param)
                    resolve(realSql);
                    if(!that.isTrans){
                        connection.release();
                    }
                    return;
                }
                connection.query(sql,param,function(err,res){
                    console.log(sql,param);
                    if(res != null){
                        resolve(res['affectedRows']);
                    }else{
                        resolve(res);
                    }
                    if(!that.isTrans){
                        connection.release();
                    }
                })
            })
        })
    }

    /**
     * 字段值(延迟)增长
     * @access public
     * @param string  $field    字段名
     * @param integer $step     增长值
     * @return integer|true
     * @throws Exception
     */
    async setInc(field, step = 1)
    {
        let condition = (this.options['where']) != null ? this.options['where'] : [];
        if (Object.keys(condition) === 0) {
            // 没有条件不做任何更新
            throw new Error('no data to update');
        }
        return await this.setField(field, ['inc', step]);
    }

    /**
     * 字段值(延迟)增长
     * @access public
     * @param string  $field    字段名
     * @param integer $step     增长值
     * @return integer|true
     * @throws Exception
     */
    async setDec(field, step = 1)
    {
        let condition = (this.options['where']) != null ? this.options['where'] : [];
        if (Object.keys(condition) === 0) {
            // 没有条件不做任何更新
            throw new Error('no data to update');
        }
        return await this.setField(field, ['dec', step]);
    }

    /**
     * 设置记录的某个字段值
     * 支持使用数据库字段和方法
     * @access public
     * @param string|array $field 字段名
     * @param mixed        $value 字段值
     * @return integer
     */
    async setField(field, value = '')
    {
        let data = [];
        if (typeof field === 'object') {
            data = field;
        } else {
            data[field] = value;
        }
        return await this.update(data);
    }

    /**
     * 指定AND查询条件
     * @access public
     * @param mixed field     查询字段
     * @param mixed op        查询表达式
     * @param mixed condition 查询条件
     * @return this
     */
    where(field, op = null, condition = null) {
        let param = arguments;
        param = Array.prototype.slice.apply(param)
        param.shift()
        this.parseWhereExp('AND', field, op, condition, param);
        return this;
    }

    /**
     * 指定OR查询条件
     * @access public
     * @param mixed $field     查询字段
     * @param mixed $op        查询表达式
     * @param mixed $condition 查询条件
     * @return $this
     */
    whereOr(field, op = null, condition = null)
    {
        let param = arguments;
        param = Array.prototype.slice.apply(param)
        param.shift()
        this.parseWhereExp('OR', field, op, condition, param);
        return this;
    }

    // PDO::PARAM_STR=2
    bind(key, value = false, type = 2)
    {
        if (typeof key === 'object') {
            Util.mergeArray(this.mBind,key)
        } else {
            this.mBind[key] = [value, type];
        }
        return this;
    }

    /**
     * 参数绑定
     * @access public
     * @param mixed   $key   参数名
     * @param mixed   $value 绑定变量值
     * @param integer $type  绑定类型
     * @return $this
     */
    setBind(key, value = false, type = 2) {
        if (key instanceof Array) {
            this.mBind = this.mBind.concat(key);
        } else {
            this.mBind[key] = [value, type];
        }
        return this;
    }

    getBind() {
        let bind = this.mBind;
        this.mBind = [];
        return bind;
    }

    isBind(key){
        return this.mBind[key] != null;
    }

    /**
     * 启动事务
     * @access public
     * @return void
     */
    async startTrans()
    {
        return new Promise(resolve => {
            this.db.getConn((connection)=>{
                connection.beginTransaction();
                this.isTrans = true;
                console.log("startTrans");
                resolve(this);
            })
        })
    }

    /**
     * 用于非自动提交状态下面的查询提交
     * @access public
     * @return void
     * @throws PDOException
     */
    async commit()
    {
        return new Promise(resolve => {
            this.db.getConn((connection)=>{
                connection.commit();
                connection.release();
                this.isTrans = false;
                console.log("commit");
                resolve(0);
            })
        })
    }

    /**
     * 事务回滚
     * @access public
     * @return void
     * @throws PDOException
     */
    async rollback()
    {
        return new Promise(resolve => {
            this.db.getConn((connection)=>{
                connection.rollback();
                connection.release();
                this.isTrans = false;
                console.log("rollback");
                resolve(0);
            })
        })
    }

    field(field,except = false,tableName='',alias){
        if (field == null) {
            return this;
        }
        if (typeof field === 'string') {
            // if (/[\<\'\"\(]/.src(field)) {
            //     // 暂不支持表达式
            //     return false;
            // }
            let arr = field.split(',')
            field = [];
            for(let key in arr){
                let fa = arr[key].split('AS');
                if(fa.length === 1){
                    fa = arr[key].split('as');
                }
                field[fa[0].trim()] = fa.length > 1 ? fa[1].trim() : fa[0].trim();
            }
        }
        if(this.options['field'] != null){
            field = Util.mergeArray(this.options['field'],field);
        }
        this.options['field'] = field;
        return this;
    }

    /**
     * 查询SQL组装 join
     * @access public
     * @param mixed  join      关联的表名
     * @param mixed  condition 条件
     * @param string type      JOIN类型
     * @return $this
     */
    join(join, condition = null, type = 'INNER'){
        if (condition == null) {
            // 如果为组数，则循环调用join
            for(let key in join){
                let value = join[key];
                if(value instanceof Array && value.length >= 2){
                    this.join(value[0],value[1],value[2] != null ? value[2] : type)
                }
            }
        }else{
            let table = this.getJoinTable(join);
            if(this.options['join_tag'] == null){
                this.options['join_tag'] = [];
            }
            this.options['join_tag'].push([table, type.toUpperCase(), condition]);
        }
        return this;
    }

    leftJoin(join,condition = null){
        return this.join(join, condition,'LEFT');
    }

    /**
     * 获取Join表名及别名 支持
     * ['prefix_table或者子查询'=>'alias'] 'prefix_table alias' 'table alias'
     * @access public
     * @param array|string $join
     * @return array|string
     */
    getJoinTable(join, alias = null)
    {
        // 传入的表名为数组
        let table = [];
        if (join instanceof Array) {
            table = join;
            alias = join.shift()
        } else {
            join = join.trim();
            // if (false !== strpos($join, '(')) {
            if(join.indexOf('(') > 0){
                // 使用子查询
                table = join;
            } else {
                if(join.indexOf(' ') > 0){
                    // 使用别名
                    let a = join.split(' ');
                    table = a[0];
                    alias = a[1];
                } else {
                    // 没有使用别名
                    table = join;
                    alias = join;
                }
            }
            if (table !== alias) {
                let t = [];
                t[table] = alias;
                table = t;
            }
        }
        return table;
    }

    /**
     * 指定group查询
     * @access public
     * @param string group GROUP
     * @return $this
     */
    group(group)
    {
        this.options['group'] = group;
        return this;
    }

    /**
     * 指定having查询
     * @access public
     * @param string $having having
     * @return $this
     */
    having(having)
    {
        this.options['having'] = having;
        return this;
    }

    /**
     * 指定distinct查询
     * @access public
     * @param string $distinct 是否唯一
     * @return $this
     */
    distinct(distinct)
    {
        this.options['distinct'] = distinct;
        return this;
    }

    /**
     * 指定排序 order('id','desc') 或者 order(['id'=>'desc','create_time'=>'desc'])
     * @access public
     * @param string|array $field 排序字段
     * @param string       $order 排序
     * @return $this
     */
    order(field){
        this.options['order'] = field;
        return this;
    }

    /**
     * 指定查询数量
     * @access public
     * @param mixed $offset 起始位置
     * @param mixed $length 查询数量
     * @return $this
     */
    limit(offset, length = null)
    {
        if (length == null && offset.toString().indexOf(',') > 0) {
            let a = offset.split(',');
            offset = a[0];
            length = a[1];
        }
        this.options['limit'] = parseInt(offset) + (length != null ? ',' + parseInt(length) : '');
        return this;
    }

    /**
     * 指定强制索引
     * @access public
     * @param string $force 索引名称
     * @return $this
     */
    force(force)
    {
        this.options['force'] = force;
        return this;
    }

    /**
     * 查询注释
     * @access public
     * @param string $comment 注释
     * @return $this
     */
    comment(comment)
    {
        this.options['comment'] = comment;
        return this;
    }

    /**
     * 获取执行的SQL语句
     * @access public
     * @param boolean $fetch 是否返回sql
     * @return $this
     */
    fetchSql(fetch = true)
    {
        this.options['fetch_sql'] = fetch;
        return this;
    }

    /**
     * 指定查询lock
     * @access public
     * @param bool|string $lock 是否lock
     * @return $this
     */
    lock(lock = true)
    {
        this.options['lock']   = lock;
        return this;
    }


    /**
     * 查询SQL组装 union
     * @access public
     * @param mixed   $union
     * @param boolean $all
     * @return $this
     */
    union(union, all = false)
    {
        if(this.options['union'] == null){
            this.options['union'] = [];
            this.options['union']['type'] = 'UNION';
        }
        this.options['union']['type'] = all ? 'UNION ALL' : 'UNION';

        if (typeof union === 'object') {
            this.options['union'] = Util.mergeArray(this.options['union'], union);
        } else {
            this.options['union'] = union;
        }
        return this;
    }

    /**
     * 设置数据
     * @access public
     * @param mixed $field 字段名或者数据
     * @param mixed $value 字段值
     * @return $this
     */
    data(field, value = null)
    {
        if(this.options['data'] == null){
            this.options['data'] = []
        }
        if (typeof field === 'object') {
            this.options['data'] = Object.keys(this.options['data']).length === 0 ? Util.mergeArray(this.options['data'],field) : field;
        } else {
            this.options['data'][field] = value;
        }
        return this;
    }

    /**
     * 字段值增长
     * @access public
     * @param string|array $field 字段名
     * @param integer      $step  增长值
     * @return $this
     */
    inc(field, step = 1)
    {
        let fields = typeof field === 'string' ? field.split(',') : field;
        for(let i in fields){
            this.data(fields[i],['inc',step])
        }
        return this;
    }

    /**
     * 字段值减少
     * @access public
     * @param string|array $field 字段名
     * @param integer      $step  增长值
     * @return $this
     */
    dec(field, step = 1)
    {
        let fields = typeof field === 'string' ? field.split(',') : field;
        for(let i in fields){
            this.data(fields[i],['dec',step])
        }
        return this;
    }

    /**
     * 使用表达式设置数据
     * @access public
     * @param string $field 字段名
     * @param string $value 字段值
     * @return $this
     */
    exp(field, value)
    {
        this.data(field, value);
        return this;
    }

// 获取当前数据表绑定信息
    getFieldsBind(options) {
        let types = this.getFieldsType(options);
        let bind = [];
        if (types) {
            for (let key in types) {
                bind[key] = this.getFieldBindType(types[key]);
            }
        }
        return bind;
    }

    // 获取当前数据表字段类型
    getFieldsType(options) {
        return this.getTableInfo(options['table'], 'type');
    }

    /**
     * 获取字段绑定类型
     * @access public
     * @param string $type 字段类型
     * @return integer
     */
    getFieldBindType(type) {
        let bind = 0;
        if (/(int|double|float|decimal|real|numeric|serial)/is.test(type)) {
            bind = 1;
        } else if (/bool/is.test(type)) {
            bind = 5;
        } else {
            bind = 2;
        }
        return bind;
    }

    /**
     * 获取数据表信息
     * @access public
     * @param string $tableName 数据表名 留空自动获取
     * @param string $fetch     获取信息类型 包括 fields type bind pk
     * @return mixed
     */
    getTableInfo(tableName = '', fetch = ''){
        if (!tableName) {
            tableName = this.getTable();
        }

        return;
        if (typeof tableName === 'string' && tableName.indexOf(',') > 0) {
            // 多表不获取字段信息
            return false;
        }

        // 获取表名，忽略别名
        let guid = tableName.split(' ')[0];
        if(this.info[guid] != null){

        }
    }

    parseWhereExp(logic, field, op, condition, param = []) {
        let where = [];
        if (typeof field === 'string' && /[,=\>\<\'\"\(\s]/.test(field)) {
            where.push(['exp', field]);
            if (op instanceof Array) {
                // 参数绑定
                this.setBind(op);
            }
        } else if (op == null && condition == null) {
            if (typeof field === 'object') {
                // 数组批量查询
                where = field;
            } else if (field) {
                // 字符串查询
                if (!isNaN(field)) {
                    where.push(['exp', field]);
                } else {
                    where[field] = ['null', ''];
                }
            }
        } else if (op instanceof Array) {
            where[field] = param;
        } else if (Util.inArray(op.toString().toLowerCase(), ['null', 'notnull', 'not null'])) {
            // null查询
            where[field] = [op, ''];
        } else if (condition == null) {
            // 字段相等查询
            where[field] = ['eq', op];
        } else {
            where[field] = [op, condition];
        }
        if (where != null) {
            if (this.options['where'] == null) {
                this.options['where'] = [];
            }
            if (this.options['where'][logic] == null) {
                this.options['where'][logic] = [];
            }

            Util.mergeArray(this.options['where'][logic], where);
            // this.options['where'][logic] = this.options['where'][logic].concat(where);
        }
        let map = this.options['where'][logic]
    }

    async query(query, params) {
        return new Promise(resolve => {
            this.db.getConn((connection)=>{
                let that = this;
                connection.query(query, params, function (err, res) {
                    resolve(res);
                    if(!that.isTrans){
                        connection.release();
                    }
                })
            });
        })
    }

}

export default Query;