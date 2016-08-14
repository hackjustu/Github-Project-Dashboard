"use strict"

const Account = require('./configs/account');
const Utils = require('./helpers/my_utils');
const User = require('./crawl_user');
const ProjectMembers = require('./helpers/project_members.js');
const Promise = require('bluebird');
const Firebase = require('firebase');
const filepath = "./helpers/project_member_list.txt";

let db = {};

// 新Firebase的initialization方法
let mainApp = Firebase.initializeApp({
    serviceAccount: Account.firebase_config,
    databaseURL: "https://bittiger-project-geeks-ranking.firebaseio.com",
});

db.mainApp = mainApp.database();
db.user_events = db.mainApp.ref("user_events");
db.user_ranking_info = db.mainApp.ref("user_ranking_info");

let crawl_github_auth = (production) => {

    crawl_github(production);
}

let crawl_github = (production) => {

    let current_time = Utils.get_current_timestamp();
    let user_events = [];

    let project_members = ProjectMembers.get_project_member_list(filepath);
    for (let i = 0; i < project_members.length; i++) {
        let member = {
            'login': project_members[i],
            'organization': 'bittiger'
        }
        user_events.push(User.crawl_user(member));
    }

    // Wait all the crawling to finish
    Promise.all(user_events)
    .catch((err) => {
        console.log(err);
    })
    .then((member_events) => {

        console.log("Finished crawling all member events!!");

        // sort the members based on events
        member_events.sort((a, b) => {

            if (b['Total'] != a['Total']) {
                return b['Total'] - a['Total'];
            } else if (b['PushEvent'] != a['PushEvent']) {
                return b['PushEvent'] - a['PushEvent'];
            } else if (b['PullRequestEvent'] != a['PullRequestEvent']) {
                return b['PullRequestEvent'] - a['PullRequestEvent'];
            } else if (b['CreateEvent'] != a['CreateEvent']) {
                return b['CreateEvent'] - a['CreateEvent'];
            } else {
                return b['ForkEvent'] - a['ForkEvent'];
            }
        });

        // retrieve members' last ranking from Firebase
        db.user_ranking_info.once("value")
        .catch((err) => {
            console.log(err);
        })
        .then((snapshot) => {
            console.log("Finished retrieving data from db~~");

            let previous_rankings = {};
            if (snapshot.exists()) {
                previous_rankings = snapshot.val();
            }

            for (let i = 0; i < member_events.length; i++) {
                let user = member_events[i].login;
                let current_ranking = i + 1;
                if (previous_rankings[user]) {
                    let ranking_records = previous_rankings[user];
                    let last_ranking = ranking_records[ranking_records.length - 1].ranking;

                    member_events[i].ranking_change = current_ranking - last_ranking;
                    previous_rankings[user].push({
                        'timestamp': current_time,
                        'ranking': current_ranking
                    });

                    // Adjust the previous ranking range. If we have more than 100 records, we'll keep the latest 30 records.
                    if (previous_rankings[user].length > 100) {
                        let pre_range = previous_rankings[user];
                        let pre_range_len = pre_range.length;
                        let lastest_30_range = previous_range.slice(pre_range_len - 30, pre_range_len);
                        previous_rankings[user] = lastest_30_range;
                    }
                } else {
                    // user not exists in last rankings
                    previous_rankings[user] = [{
                        'timestamp': current_time,
                        'ranking': current_ranking
                    }];
                    member_events[i].ranking_change = 'new';
                }

                let len = previous_rankings[user].length;
                let max_num = 30;
                if (len <= max_num) {
                    member_events[i].ranking_history = previous_rankings[user];
                } else {
                    let last_few_records = previous_rankings[user].slice(len - max_num, len);
                    member_events[i].ranking_history = last_few_records;
                }
            }

            let update_tasks = [];
            // update members' ranking records to Firebase
            if (production) {
                console.log("-- Update members's ranking records to Firebase.");
                let promise_previous_rankings_update = db.user_ranking_info.set(previous_rankings);
                update_tasks.push(promise_previous_rankings_update);
            }

            // retrieve the top 25 users' information
            let top25_members = member_events.slice();
            if (top25_members.length >= 5) {
                top25_members = top25_members.slice(0, 25);
            }

            console.log('Updating the database...');
            let promise_events_update = db.user_events.child("events").set(top25_members);
            let promise_time_udpate   = db.user_events.child('created_time').set(current_time);

            update_tasks.push(promise_events_update);
            update_tasks.push(promise_time_udpate);

            Promise.all(update_tasks)
            .catch((err) => {
                console.log(err);
            })
            .finally(terminate_app);
        });
    });
}

function terminate_app() {
    console.log("Finished!");
    // process.exit();
}

exports.crawl_github = crawl_github_auth;
