const fetch = require('node-fetch');
const Auth = require('./auth');
let exportApi = {};
exportApi.problemList = async (ProblemListPages) => await fetch("https://noip.belledu.com/api/problem/pageProblemsList?page=" + String(ProblemListPages) + "&limit=50&title=&difficulty=&categoryId=&result=&tagId=", {
    "credentials": "include",
    "headers": {
        ...Auth.AuthHander,
        "Authorization": Auth.getKey()
    },
    "referrer": "https://noip.belledu.com/",
    "method": "GET",
    "mode": "cors"
});
exportApi.saveSlove = async (content, id) => await fetch("https://noip.belledu.com/api/problem/problemSave", {
    "credentials": "include",
    "headers": {
        "Content-Type": "application/json;charset=UTF-8",
        "Authorization": Auth.getKey(),
        ...Auth.AuthHander
    },
    "referrer": "https://noip.belledu.com/",
    "body": JSON.stringify({ content: String(content), language: "C++", problemId: String(id) }),
    "method": "POST",
    "mode": "cors"
});
exportApi.testSlove = async (content, input, id) => await fetch("https://noip.belledu.com/api/problem/checkProblem", {
    "credentials": "include",
    "headers": {
        ...Auth.AuthHander,
        "Content-Type": "application/json;charset=UTF-8",
        "Authorization": Auth.getKey(),
    },
    "referrer": "https://noip.belledu.com/",
    "body": JSON.stringify({ "content": String(content), "input": String(input), "language": "C++", "problemId": String(id) }),
    "method": "POST",
    "mode": "cors"
});
exportApi.submitSlove = async (content, id) => await fetch("https://noip.belledu.com/api/problem/submitProblem", {
    "credentials": "include",
    "headers": {
        ...Auth.AuthHander,
        "Content-Type": "application/json;charset=UTF-8",
        "Authorization": Auth.getKey(),
    },
    "referrer": "https://noip.belledu.com/",
    "body": JSON.stringify({ "content": String(content), "language": "C++", "problemId": String(id) }),
    "method": "POST",
    "mode": "cors"
});
exportApi.querySloveResult = async (uuid) => await fetch("https://noip.belledu.com/api/judge/query_problem_result?uuid=7569bfba-027f-434a-b6b5-eb7a405cb66e", {
    "credentials": "include",
    "headers": {
        ...Auth.AuthHander,
        "Authorization": Auth.getKey(),
    },
    "referrer": "https://noip.belledu.com/",
    "method": "GET",
    "mode": "cors"
});
const sloveResultList = async (code, memberCode) => await fetch("https://noip.belledu.com/api/problem/pageMemberSubmitRecordList?limit=30&page=1&code=" + code + "&memberNicknameOrCode=" + memberCode + "&result=", {
    "credentials": "include",
    "headers": {
        ...Auth.AuthHander,
        "Authorization": Auth.getKey(),
    },
    "referrer": "https://noip.belledu.com/",
    "method": "GET",
    "mode": "cors"
});
exportApi.getSloveResultUrl = async (code) => {
    let profile = await (await Auth.profile()).json();
    let result = await (await sloveResultList(code, profile.data.memberCode)).json()
    return result;
}
exportApi.getTestDetails = async (args) => await fetch("https://noip.belledu.com/api/problem/problemDetail?problemId=" + args, {
    "credentials": "include",
    "headers": {
        ...Auth.AuthHander, "Authorization": Auth.getKey()
    },
    "referrer": "https://noip.belledu.com/",
    "method": "GET",
    "mode": "cors"
});
module.exports = exportApi;