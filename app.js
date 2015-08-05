// @file zuowen
// @author xb
/*global console */
'use strict';
const R = require('ramda');
const _ = require('koa-route');
const koa = require('koa');
const app = koa();
const knex = require('koa-knex');
const json = require('koa-json');
// const cash = require('koa-cash');
app.use(knex({
    client: 'sqlite3',
    connection: {
        filename: './zw.sqlite3'
    }
}));
app.use(json());
// const cache = require('lru-cache')({
//     maxAge: 30000 // global max age
// });
// https://github.com/koajs/cash
// app.use(cash({
//     get: function* (key, maxAge) {
//         return cache.get(key);
//     },
//     set: function* (key, value) {
//         cache.set(key, value);
//     }
// }));
const zw = {

    root: function* (next) {
        yield next;
        this.body = '作文比赛';
    },

    district: function* (year) {
        const r = yield this.knex('archive').where({
            year: year
        }).distinct('district').select('district');
        this.body = R.map(R.prop('district'), r);
    },

    school: function* (year, district) {
        const r = yield this.knex('archive').where({
            year: year,
            district: district
        }).distinct('school').select('school');
        this.body = R.map(R.prop('school'), r);
    },

    posts: function* (year, district, school) {
        const r = yield this.knex('archive').where({
            year: year,
            district: district,
            school: school
        }).select('title', 'nid', 'year', 'name');
        this.body = r;
    },

    singlePost: function* (year, nid) {
        const r = yield this.knex('archive').where({
            year: '2011',
            nid: '146'
        }).select();
        this.body = r;
    },

    test: function* () {
        // 使用cache后 reqs/sec 从 10 上升到 5000
        // if (yield * this.cashed()) return;
        this.body = yield this.knex('archive').count('year');
    }
};

app.use(_.get('/', zw.root));
app.use(_.get('/:year', zw.district));
app.use(_.get('/:year/:district', zw.school));
app.use(_.get('/:year/:district/:school', zw.posts));
// 这里必须将path增加为4个 否则上面同为3个path深度的会截获请求
// 然后返回的查询数据结果为空。
// 非常令人疑惑。
// 举例：
// /archive/:year/:nid 用户按会先匹配到 /:year/:district/:school
app.use(_.get('/archive/article/:year/:nid', zw.singlePost));
app.use(_.get('/test', zw.test));

app.listen(3000);
console.log('listening on port 3000');
