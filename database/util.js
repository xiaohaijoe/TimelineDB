import DB from "./db";
// import Moment from 'moment'

let Util = {
    mergeArray: function (array1, array2) {
        if(array1 == null){
            array1 = [];
        }
        if(array2 == null){
            array2 = [];
        }
        for (let key in array2) {
            array1[key] = array2[key];
        }
        return array1;
    },

    inArray: function (search, array) {
        for (let i in array) {
            if (array[i] === search) {
                return true;
            }
        }
        return false;
    },

    // 是否标量
    isScalar: function (obj) {
        if (typeof obj === 'number' || typeof obj === 'string' || typeof obj === 'boolean') {
            return true
        }
        return false;
    },

    /**
     * 模仿PHP的strtotime()函数
     * strtotime('2012-07-27 12:43:43') OR strtotime('2012-07-27')
     * @return 时间戳
     */
    strToTime: function (str) {
        var _arr = str.split(' ');
        var _day = _arr[0].split('-');
        _arr[1] = (_arr[1] == null) ? '0:0:0' : _arr[1];
        var _time = _arr[1].split(':');
        for (var i = _day.length - 1; i >= 0; i--) {
            _day[i] = isNaN(parseInt(_day[i])) ? 0 : parseInt(_day[i]);
        }
        for (var i = _time.length - 1; i >= 0; i--) {
            _time[i] = isNaN(parseInt(_time[i])) ? 0 : parseInt(_time[i]);
        }
        var _temp = new Date(_day[0], _day[1] - 1, _day[2], _time[0], _time[1], _time[2]);
        return _temp.getTime() / 1000;
    },

    dateFormat : function(format,date){
        // let day = new Moment.unix(date);
        // return day.format(format);
        return 0;
    },

    /**
     * 生成一个用不重复的ID
     */
    genNonDuplicateID: function (randomLength) {
        return Number(Math.random().toString().substr(3, randomLength) + Date.now()).toString(36)
    },

    debug: function (msg) {
        let param = arguments;
        for(let k in param){
            if(param[k] instanceof Array){
                for(let i in param[k]){
                    console.log('debug array:',param[k],'key:',i,'value:',param[k][i]);
                }
            }else{
                console.log(param[k]);
            }
        }
    }
};
export default Util;