// @file 上海中学生作文比赛09年和11年网上比赛文章存档站点代码
// @author xb

/* global console */

// ## 说明
// 上海中学生作文比赛09年和11年网上比赛文章存档。
//
// 之前是drupal站点。建议内容不会更新。转为更轻巧的实现方式。

// ## 前期将csv导入到sqlite3的准备工作

// sqlite zw.db
// .mode csv
// 下面这行就是没有结尾分号，因为它不是sql命令
// .import new-2009.csv archive
// alter table archive add 'year' TEXT;
// update archive set year = 2009;
// alter table y11 add 'year' TEXT;
// update y11 set year = 2011 ;
// insert into archive select title, body, nid, date, district, school, name, type, year from y11;

'use strict';

const R = require('ramda');
const _ = require('koa-route');
const koa = require('koa');
const app = koa();
const knex = require('koa-knex');
const json = require('koa-json');
const cash = require('koa-cash');
const cache = require('lru-cache')({
    maxAge: 3000 // global max age
});

app.use(knex({
    client: 'sqlite3',
    connection: {
        filename: './zw.sqlite3'
    }
}));

app.use(json());

// https://github.com/koajs/cash
app.use(cash({
    get: function* (key, maxAge) {
        return cache.get(key);
    },
    set: function* (key, value) {
        cache.set(key, value);
    }
}));

// 由于每个路径都会先经过这个中间件， 因此等于默认给所有路径
// 都加上了缓存。：）
// app.use(function* (next) {
//     if (yield * this.cashed()) return;
//     yield next;
// });


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
        // if (yield * this.cashed()) return;
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
