import Util from './util'

class Builder {
    constructor() {
        // 数据库表达式
        this.exp = {
            'eq': '=',
            'neq': '<>',
            'gt': '>',
            'egt': '>=',
            'lt': '<',
            'elt': '<=',
            'notlike': 'NOT LIKE',
            'like': 'LIKE',
            'in': 'IN',
            'exp': 'EXP',
            'notin': 'NOT IN',
            'not in': 'NOT IN',
            'between': 'BETWEEN',
            'not between': 'NOT BETWEEN',
            'notbetween': 'NOT BETWEEN',
            'exists': 'EXISTS',
            'notexists': 'NOT EXISTS',
            'not exists': 'NOT EXISTS',
            'null': 'NULL',
            'notnull': 'NOT NULL',
            'not null': 'NOT NULL',
            '> time': '> TIME',
            '< time': '< TIME',
            '>= time': '>= TIME',
            '<= time': '<= TIME',
            'between time': 'BETWEEN TIME',
            'not between time': 'NOT BETWEEN TIME',
            'notbetween time': 'NOT BETWEEN TIME'
        };

        this.selectSql = 'SELECT%DISTINCT% %FIELD% FROM %TABLE%%FORCE%%JOIN%%WHERE%%GROUP%%HAVING%%ORDER%%LIMIT% %UNION%%LOCK%%COMMENT%';
        this.insertSql = '%INSERT% INTO %TABLE% (%FIELD%) VALUES (%DATA%) %COMMENT%';
        this.insertAllSql = 'INSERT INTO %TABLE% (%FIELD%) %DATA% %COMMENT%';
        this.updateSql = 'UPDATE %TABLE% SET %SET% %JOIN% %WHERE% %ORDER%%LIMIT% %LOCK%%COMMENT%';
        this.deleteSql = 'DELETE FROM %TABLE% %USING% %JOIN% %WHERE% %ORDER%%LIMIT% %LOCK%%COMMENT%';
        this.query = '';
    }

    setQuery(query) {
        this.query = query;
    }

    setConnection(connection){
        this.connection = connection;
    }

    parseDistinct(distinct = '') {
        return distinct.length !== 0 ? ' DISTINCT ' : '';
    }

    /**
     * table分析
     * @access protected
     * @param Array tables
     * @return string
     */
    parseTable(tables = '', options = []) {
        let array = [];
        if (typeof tables === 'object') {
            for (let prop in tables) {
                if (tables.hasOwnProperty(prop)) {
                    //判断是否有别名
                    array.push(tables[prop] === prop ? prop : prop + " " + tables[prop]);
                }
            }
        } else if (typeof tables === 'string') {
            let arr = tables.split(',');
            arr.forEach(function (e) {
                // 去掉前后空格
                e = e.replace(/(^\s+)|(\s+$)/g,"");
                let ta = e.split(" ");
                array.push(ta.length === 1 ? ta[0] : ta[0] + " " + ta[1])
            })
        }
        return array.join(',')
    }

    parseField(fields = []) {
        let fieldsStr = '*';
        if ((typeof fields === 'string' && '*' === fields) || Object.keys(fields).length === 0) {
            fieldsStr = '*';
        } else if (typeof fields === 'object') {
            // 支持 'field1'=>'field2' 这样的字段别名定义parseValue
            let array = [];
            for (let key in fields) {
                if (fields.hasOwnProperty(key)) {
                    //判断是否有别名
                    array.push(fields[key] === key ? key : key + " AS " + fields[key]);
                }
            }
            fieldsStr = array.join(',');
        }
        return fieldsStr;
    }

    parseJoin(join, options = []) {
        let joinStr = '';
        if (join != null && join.length > 0) {
            for (let key in join) {
                let item = join[key];
                let table = item[0];
                let type = item[1];
                let on = item[2].split(',');
                let condition = [];
                for (let k in on) {
                    let val = on[k];
                    if (val.indexOf('=') > 0) {
                        let s = val.split('=');
                        let val1 = s[0];
                        let val2 = s[1];
                        condition.push(val1 + '=' + val2);
                    } else {
                        condition.push(val);
                    }
                }
                table = this.parseTable(table, options);
                joinStr += ' ' + type + ' JOIN ' + table + ' ON ' + condition.join("AND");
            }
        }
        return joinStr;
    }

    parseWhere(where = [], options = []) {
        let whereStr = this.buildWhere(where, options);
        return whereStr.length === 0 ? '' : ' WHERE ' + whereStr;
    }

    // where子单元分析
    parseWhereItem(field, val, rule = '', options = [], binds = [], bindName = null) {
        let key = field.length > 0 ? field : '';

        if (!(val instanceof Array)) {
            val = ['=', val]
        }
        let exp = val[0];
        let value = val[1];
        // 对一个字段使用多个查询条件
        if (exp instanceof Array) {
            let item = val.pop();
            // 传入 or 或者 and
            if (typeof item === 'string' && Util.inArray(item, ['AND', 'and', 'OR', 'or'])) {
                let rule = item;
            } else {
                val.push(item);
            }
            let str = [];
            for (let k in val) {
                let bindName = 'where_' + field.replace('.', '_') + '_' + k;
                str.push(this.parseWhereItem(field, item, rule, options, binds, bindName));
            }
            return '( ' + str.join(' ' + rule + ' ') + ' )';
        }

        // 检测操作符
        if (!Util.inArray(exp, this.exp)) {
            exp = exp.toLowerCase();
            if (this.exp[exp] != null) {
                exp = this.exp[exp];
            } else {
                throw new Error('where express error:' + exp);
            }
        }
        bindName = bindName != null ? bindName : 'where_' + field.replace('.', '_');
        // PDO::PARAM_STR
        let bindType = binds[field] != null ? binds[field] : 2;
        // if (Util.isScalar(value) && binds.hasOwnProperty(field) && !Util.inArray(exp, ['EXP', 'NOT NULL', 'NULL', 'IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN']) && exp.indexOf('TIME') === -1) {
        if (Util.isScalar(value) && binds.hasOwnProperty(field) && !Util.inArray(exp, ['EXP', 'NOT NULL', 'NULL', 'IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN']) && exp.indexOf('TIME') === -1) {
            if (value.toString().indexOf(':') > 0 || this.query.isBind(value.toString().substr(1))) {
                if (this.query.isBind(bindName)) {
                    bindName += '_' + Util.genNonDuplicateID(5);
                }
                this.query.bind(bindName, value, bindType);
                value = ':' + bindName;
            }
        }

        let whereStr = '';
        if (Util.inArray(exp, ['=', '<>', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE'])) {
            // 比较运算 及 模糊匹配
            whereStr += key + ' ' + exp + ' ' + this.parseValue(value, field);
        } else if ('EXP' === exp) {
            // 表达式查询
            whereStr += '( ' + key + ' ' + value + ' )';
        } else if (Util.inArray(exp, ['NOT NULL', 'NULL'])) {
            // NULL 查询
            whereStr += key + ' IS ' + exp;
        } else if (Util.inArray(exp, ['NOT IN', 'IN'])) {
            // IN 查询
            value = (value instanceof Array) ? value : value.split(',');
            let zone = '';
            if (binds.hasOwnProperty(field)) {
                let bind = [];
                let array = [];
                for (let k in value) {
                    let v = value[k];
                    bind[bindName + '_in_' + k] = [v, bindType];
                    array.push(':' + bindName + '_in_'.k);
                }
                this.query.bind(bind);
                zone = array.join(',');
            } else {
                zone = this.parseValue(value, field).join(',');
            }
            whereStr += key + ' ' + exp + ' (' + zone + ')';
        } else if (Util.inArray(exp, ['NOT BETWEEN', 'BETWEEN'])) {
            // BETWEEN 查询
            let data = (value instanceof Array) ? value : value.split(',');
            let between = '';
            if (binds.hasOwnProperty(field)) {
                let bind = [];
                bind[bindName + '_between_1'] = [data[0], bindType];
                bind[bindName + '_between_2'] = [data[1], bindType]
                this.query.bind(bind);
                between = ':' + bindName + '_between_1' + ' AND :' + bindName + '_between_2';
            } else {
                between = this.parseValue(data[0], field) + ' AND ' + this.parseValue(data[1], field);
            }
            whereStr += key + ' ' + exp + ' ' + between;
        } else if (Util.inArray(exp, ['NOT EXISTS', 'EXISTS'])) {
            // EXISTS 查询
            whereStr += exp + ' (' + value + ')';
        } else if (Util.inArray(exp, ['< TIME', '> TIME', '<= TIME', '>= TIME'])) {
            whereStr += key + ' ' + exp.substr(0, 2) + ' ' + this.parseDateTime(value, field, options, bindName, bindType);
        } else if (Util.inArray(exp, ['BETWEEN TIME', 'NOT BETWEEN TIME'])) {
            if (typeof value === 'string') {
                value = value.split(',');
            }
            whereStr += key + ' ' + exp.substr(0, -4) + this.parseDateTime(value[0], field, options, bindName + '_between_1', bindType) + ' AND ' + this.parseDateTime(value[1], field, options, bindName + '_between_2', bindType);
        }
        return whereStr;
    }

    /**
     * 日期时间条件解析
     * @access protected
     * @param string    value
     * @param string    key
     * @param array     options
     * @param string    bindName
     * @param integer   bindType
     * @return string
     */
    parseDateTime(value, key, options = [], bindName = null, bindType = null) {
        // 获取时间字段类型
        let type = this.query.getFieldsType(options);
        let info = null
        if (type[key] != null) {
            info = type[key];
        }
        if (info != null) {
            value = Util.strToTime(value) ? Util.strToTime(value) : value;
            if (/(datetime|timestamp)/is.test(info)) {
                // 日期及时间戳类型
                // value = Util.dateFormat('Y-m-d H:i:s', value);
                value = Util.dateFormat('Y-M-D H:m:s', value);
            } else if (/(date)/is.test(info)) {
                // 日期及时间戳类型
                value = Util.dateFormat('Y-M-D', value);
            }
        }
        bindName = bindName ? bindName : key;
        this.query.bind(bindName, value, bindType);
        return ':' + bindName;
    }

    /**
     * group分析
     * @access protected
     * @param mixed $group
     * @return string
     */
    parseGroup(group = '') {
        return group.length > 0 ? ' GROUP BY ' + group : '';
    }

    parseHaving(having = '') {
        return having.length > 0 ? ' HAVING ' + having : '';
    }

    parseOrder(order = '') {
        return order.length > 0 ? ' ORDER BY ' + order : '';
    }

    parseLimit(limit = '') {
        return limit.toString().length > 0 && limit.toString().indexOf('(') === -1 ? ' LIMIT ' + limit + ' ' : '';
    }

    parseUnion(union = '') {
        return '';
    }

    /**
     * 设置锁机制
     * @access protected
     * @param bool|string $lock
     * @return string
     */
    parseLock(lock = false) {
        if (lock) {
            return lock ? ' FOR UPDATE ' : '';
        } else if (typeof lock === 'string') {
            return ' ' + lock.trim() + ' ';
        } else {
            return '';
        }
    }

    /**
     * comment分析
     * @access protected
     * @param string comment
     * @return string
     */
    parseComment(comment = '') {
        if (comment.indexOf('*/') > 0) {
            comment = comment.slice(comment.indexOf('*/'));
            // comment = strstr($coment, '*/', true);
        }
        return comment.length > 0 ? ' /* ' + comment + ' */' : '';
    }

    /**
     * index分析，可在操作链中指定需要强制使用的索引
     * @access protected
     * @param mixed $index
     * @return string
     */
    parseForce(index = '') {
        if (index.length === 0) {
            return ''
        }
        let str = index instanceof Array ? index.join(',') : index;
        return " FORCE INDEX ( " + str + " ) ";
    }

    parseKey(key) {
        return key;
    }

    /**
     * value分析
     * @access protected
     * @param mixed     $value
     * @param string    $field
     * @return string|array
     */
    parseValue(value, field = '') {
        if (typeof value === 'string') {
            value = value.indexOf(':') === -1 && this.query.isBind(value.substr(1)) ? value : this.connection.escape(value);
            // value = value.indexOf(':') === -1 && this.query.isBind(value.substr(1)) ? value : value;
        } else if (value instanceof Array) {
            for (let key in value) {
                value[key] = this.parseValue(value[key])
            }
        } else if (typeof value === 'boolean') {
            value = value ? '1' : '0';
        } else if (value == null) {
            value = 'null';
        }
        return value;
    }

    /**
     * 数据分析
     * @access protected
     * @param array     $data 数据
     * @param array     $options 查询参数
     * @return array
     * @throws Exception
     */
    parseData(data, options){
        if (Object.keys(data).length === 0) {
            return [];
        }
        let result = [];
        for(let key in data) {
            let val = data[key];
            let item = this.parseKey(key);
            if (val == null) {
                result[item] = 'NULL';
            }else if (val instanceof Array && val.length > 0) {
                switch (val[0].toLowerCase()) {
                    case 'inc':
                        result[item] = item + '+' + parseFloat(val[1]);
                        break;
                    case 'dec':
                        result[item] = item + '-' + parseFloat(val[1]);
                        break;
                    case 'exp':
                        result[item] = val[1];
                        // throw new Error('not support data:[' + val[0] + ']');
                }
            }else if (Util.isScalar(val)) {
                // 过滤非标量数据
                if (val.toString().indexOf(':') === 0 && this.query.isBind(val.toString().substr(1))) {
                    result[item] = val;
                } else {
                    key = key.replace('.', '_');
                    this.query.bind(key, val);
                    result[item] = '?';
                }
            }
        }
        return result
    }

    /**
     * 生成查询条件SQL
     * @access public
     * @param mixed     where
     * @param array     options
     * @return string
     */
    buildWhere(where = [], options = []) {
        let whereStr = '';
        let binds = this.query.getFieldsBind(options);
        for (let key in where) {
            let str = [];
            let val = where[key];
            for (let field in val) {
                let value = val[field];
                if (field.indexOf("|") > 0) {
                    // 不同字段使用相同查询条件（OR）
                    let array = field.split('|');
                    let item = [];
                    for (let k in array) {
                        item.push(this.parseWhereItem(array[k], value, '', options, binds));
                    }
                    str.push(' ' + key + ' (' + item.join(' OR ') + ' )');
                } else if (field.indexOf("&") > 0) {
                    // 不同字段使用相同查询条件（AND）
                    let array = field.split('&');
                    let item = [];
                    for (let k in array) {
                        item.push(this.parseWhereItem(array[k], value, '', options, binds));
                    }
                    str.push(' ' + key + ' (' + item.join(' AND ') + ' )');
                } else {
                    // 对字段使用表达式查询
                    // field = typeof field === 'string' ? field : '';
                    field = /^[0-9]*$/.test(field) ? '' : field;
                    str.push(' ' + key + ' ' + this.parseWhereItem(field, value, key, options, binds));
                }
            }
            let s = str.join(' ')
            whereStr += whereStr.length === 0 ? s.substr(key.length + 1) : s;
        }
        return whereStr;
    }

    buildSelectSql(options = []) {
        let sql = this.selectSql.replace('%DISTINCT%', this.parseDistinct(options['distinct']));
        sql = sql.replace('%TABLE%', this.parseTable(options['table']));
        sql = sql.replace('%FIELD%', this.parseField(options['field']));
        sql = sql.replace('%JOIN%', this.parseJoin(options['join_tag']));
        sql = sql.replace('%WHERE%', this.parseWhere(options['where'], options));
        sql = sql.replace('%GROUP%', this.parseGroup(options['group']));
        sql = sql.replace('%HAVING%', this.parseHaving(options['having']));
        sql = sql.replace('%ORDER%', this.parseOrder(options['order']));
        sql = sql.replace('%LIMIT%', this.parseLimit(options['limit']));
        sql = sql.replace('%UNION%', this.parseUnion(options['union']));
        sql = sql.replace('%LOCK%', this.parseLock(options['lock']));
        sql = sql.replace('%COMMENT%', this.parseComment(options['comment']));
        sql = sql.replace('%FORCE%', this.parseForce(options['force']));
        return sql;
    }

    getRealWhereSql(query = '', bind = []) {
        for (let key in bind) {
            if (!/^[0-9]*$/.test(key)) {
                let val = typeof bind[key] === 'string' ? "\'" + bind[key] + '\'' : bind[key];
                query = query.replace(':' + key, val)
            }
        }
        // bind = [];
        return query;
    }

    /**
     * 生成insert SQL
     * @access public
     * @param array     $data 数据
     * @param array     $options 表达式
     * @param bool      $replace 是否replace
     * @return string
     */
    buildInsertSql(data, options = [], replace = false) {
        // 分析并处理数据
        data = this.parseData(data, options);
        if (Object.keys(data).length === 0) {
            return 0;
        }
        let fields = [];
        let values = [];
        for (let key in data) {
            fields.push(key);
            values.push(data[key]);
        }
        let sql = this.insertSql.replace('%INSERT%', replace ? 'REPLACE' : 'INSERT');
        sql = sql.replace('%TABLE%', this.parseTable(options['table'], options));
        sql = sql.replace('%FIELD%', fields.join(','));
        sql = sql.replace('%DATA%', values.join(','));
        sql = sql.replace('%COMMENT%', this.parseComment(options['comment']));
        return sql;
    }

    /**
     * 生成update SQL
     * @access public
     * @param array     $data 数据
     * @param array     $options 表达式
     * @return string
     */
    buildUpdateSql(data,options = []){
        let table = this.parseTable(options['table'], options);
        data  = this.parseData(data, options);
        if (Object.keys(data).length === 0) {
            return '';
        }
        let set = [];
        for(let key in data){
            set.push(key + "=" + data[key]);
        }

        let sql = this.updateSql.replace('%TABLE%', this.parseTable(options['table'], options));
        sql = sql.replace('%SET%', set.join(','));
        sql = sql.replace('%JOIN%', this.parseJoin(options['join_tag'],options));
        sql = sql.replace('%WHERE%', this.parseWhere(options['where'],options));
        sql = sql.replace('%ORDER%', this.parseOrder(options['order'],options));
        sql = sql.replace('%LIMIT%', this.parseLimit(options['limit']));
        sql = sql.replace('%LOCK%', this.parseLock(options['lock']));
        sql = sql.replace('%COMMENT%', this.parseComment(options['comment']));
        return sql;
    }

    /**
     * 生成update SQL
     * @access public
     * @param array     $data 数据
     * @param array     $options 表达式
     * @return string
     */
    buildDeleteSql(options = []){

        let sql = this.deleteSql.replace('%TABLE%', this.parseTable(options['table'], options));
        sql = sql.replace('%USING%', options['using'] != null ? ' USING ' + this.parseTable(options['using'], options) + ' ' : '');
        sql = sql.replace('%JOIN%', this.parseJoin(options['join_tag'],options));
        sql = sql.replace('%WHERE%', this.parseWhere(options['where'],options));
        sql = sql.replace('%ORDER%', this.parseOrder(options['order'],options));
        sql = sql.replace('%LIMIT%', this.parseLimit(options['limit']));
        sql = sql.replace('%LOCK%', this.parseLock(options['lock']));
        sql = sql.replace('%COMMENT%', this.parseComment(options['comment']));
        return sql;
    }
}

export default Builder;