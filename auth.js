const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
/** @type {String} */
let key;
const AuthHander = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache"
}
/**
 * 
 * @param {String} user 
 * @param {String} password 
 * @param {Number} type 
 * @param {Number|undefined} orgType
 * @returns {Promise<JSON>}
 */
async function login(user, password, type, orgType) {
    let AuthReturn = (await (await fetch("https://noip.belledu.com/auth/token", {
        "credentials": "omit",
        "headers": { ...AuthHander, "Content-Type": "application/json;charset=UTF-8" },
        "referrer": "https://noip.belledu.com/",
        "body": "{\"logintype\":" + String(type) + ",\"password\":\"" + String(password) + "\",\"username\":\"" + String(user) + ((orgType != undefined) ? (",\"orgType\":" + String(orgType)) : "") + "\"}",
        "method": "POST",
        "mode": "cors"
    })).json());
    if (AuthReturn.data.token)
        key = AuthReturn.data.token;
    return AuthReturn;
}
/**
 * 
 * @returns {String}
 */
function getKey() {
    return key;
}
/**
 * 
 * @param {String} Key 
 */
function setKey(Key) {
    key = Key;
}
/**
 *  
 * @returns {Promise<fetch.Response>}
 */
const profile = async () => await fetch("https://noip.belledu.com/api/user/profile", {
    "credentials": "include",
    "headers": { ...AuthHander, "Authorization": key },
    "referrer": "https://noip.belledu.com/",
    "method": "GET",
    "mode": "cors"
});
const getOrgType = async () => await fetch("https://noip.belledu.com/api/check/getOrgType", {
    "credentials": "omit",
    "headers": { ...AuthHander },
    "referrer": "https://noip.belledu.com/",
    "method": "GET",
    "mode": "cors"
});
const checkLoginPassword = async () => await fetch("https://noip.belledu.com/api/member/checkMemberPassword", {
    "credentials": "include",
    "headers": {
        ...AuthHander,
        "Authorization": key
    },
    "referrer": "https://noip.belledu.com/",
    "method": "GET",
    "mode": "cors"
});
module.exports = {
    login, profile, getKey, setKey, getOrgType, AuthHander, checkLoginPassword
}