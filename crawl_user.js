"use strict"

const Account = require('./configs/account');
const Request = require('request');
const Promise = require('bluebird');
const Utils = require('./helpers/my_utils');

let username = Account.username;
let password = Account.password;
let current_date = Utils.get_current_timestamp();
let last_week_date = Utils.get_last_week_timestamp();

function crawl_user(user) {

    return new Promise((fulfill, reject) => {

        let user_info = {
            'login': user.login,
            'avatar_url': '',
            'html_url': '',
            'organization': user.organization,
            'location': 'M78',
            'Total': 0,
            'PushEvent': 0,
            'PullRequestEvent': 0,
            'CreateEvent': 0,
            'ForkEvent': 0
        }

        let funcs = Utils.make_range(1, 10).map((n) => make_request_for_events(make_option(n, user.login, 'events')));
        /*
           Insert the user_profile request at the beginning to ensure it gets called in the following .mapSeries() method
           In Javascript, unshift means push at the beginning. Use the following graph for visualiation.
           unshift -> array <- push
           shift   <- array -> pop
        */
        funcs.unshift(make_request_for_user_profile(make_option(1, user.login)));

        let promisified_funcs = Promise.resolve(funcs);
        promisified_funcs
        .mapSeries(iterator)
        .catch((err) => {
            console.log(user.login + " : " + err);
        })
        .finally(() => {
            user_info['Total'] = user_info['PushEvent'] +
                user_info['PullRequestEvent'] +
                user_info['CreateEvent'] +
                user_info['ForkEvent'];

            console.log('Finished crawling: ' + user.login);
            fulfill(user_info);
        })

        function make_request_for_events(option) {
            return function () {
                return new Promise((fulfill, reject) => {
                    Request(option, function (error, response, body) {
                        if (error) {
                            reject(error);
                        } else if (body.length == 0) {
                            reject('page empty');
                        } else {
                            let should_continue = parseBody(body);
                            if (should_continue) {
                                fulfill(body);
                            } else {
                                reject('outdated events');
                            }
                        }
                    });
                });
            }
        }

        function make_request_for_user_profile(option) {
            return function () {
                return new Promise(function (fulfill, reject) {
                    Request(option, function (error, response, body) {
                        if (error) {
                            reject(error);
                        } else {

                            user_info.avatar_url = body.avatar_url;
                            user_info.html_url = body.html_url;

                            if (body.location) {
                                user_info.location = body.location;
                            } else {
                                //console.log(user_info.location + " " + user_info.login + " " + user_info.email);
                            }
                            fulfill(body);
                        }
                    });
                });
            }
        }

        function parseBody(body) {

            let should_continue = true;
            if (!body[0] ||  body[0].created_at < last_week_date) {
                should_continue = false;
            } else {

                for (let i = 0; i < body.length; i++) {
                    let event_type = body[i].type;
                    let event_date = body[i].created_at;

                    if (event_date >= last_week_date && (
                            event_type == 'PushEvent' ||
                            event_type == 'PullRequestEvent' ||
                            event_type == 'CreateEvent' ||
                            event_type == 'ForkEvent')) {

                        user_info[event_type]++;
                    }
                }
            }
            return should_continue;
        }
    });
}

function iterator(f) {
    return f()
}

function make_option(page_number, user_id, relative_path) {

    let request_url = 'https://api.github.com/users/' + user_id;

    if (relative_path) {
        request_url += '/' + relative_path;
    }

    return {
        url: request_url, // URL to hit
        qs: { //Query string data
            page: page_number
        },
        method: 'GET', //Specify the method
        headers: { //Define headers
            'User-Agent': 'request'
        },
        auth: { //HTTP Authentication
            user: username,
            pass: password
        },
        json: true
    };
}

exports.crawl_user = crawl_user;
