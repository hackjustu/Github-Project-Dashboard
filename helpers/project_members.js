"use strict"

const fs = require('fs');

let member_list=[];

function get_project_member_list(filepath) {

	if (member_list.length == 0) {
		member_list = fs.readFileSync(filepath, "utf8").toString().trim().split('\n');
	}
	return member_list;
}

exports.get_project_member_list = get_project_member_list;
