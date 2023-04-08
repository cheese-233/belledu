// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const Auth = require('./auth');
const swig = require('swig');
const path = require('path');
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
class TestsEntryItem extends vscode.TreeItem {

}
let ProblemListPages = 1;
let RequestProblemsMax = 0;
const requestProblemList = async () => {
	let a = await fetch("https://noip.belledu.com/api/problem/pageProblemsList?page=" + String(ProblemListPages) + "&limit=50&title=&difficulty=&categoryId=&result=&tagId=", {
		"credentials": "include",
		"headers": {
			...Auth.AuthHander,
			"Authorization": Auth.getKey()
		},
		"referrer": "https://noip.belledu.com/",
		"method": "GET",
		"mode": "cors"
	});
	let jsonA = await a.json();
	RequestProblemsMax = Number(jsonA.data.count);
	return jsonA;
}

class TreeNodeProvider {
	_onDidChangeTreeData = new vscode.EventEmitter();
	onDidChangeTreeData = this._onDidChangeTreeData.event;
	refresh() {
		this._onDidChangeTreeData.fire();
	}
	constructor() { }
	getTreeItem(element) {
		return element;
	}
	async getChildren(element) {
		let problemChild = await requestProblemList();
		var childs = [];
		let index = 0;
		for (let child of problemChild.data.data) {
			var item = new TestsEntryItem(child.code + " " + child.title, vscode.TreeItemCollapsibleState.None);
			if (child.result == 1) {
				item.iconPath = new vscode.ThemeIcon("pass");
			}
			else if (child.result == 2) {
				item.iconPath = new vscode.ThemeIcon("x");
			}
			item.command = {
				command: "belledu_sidebar_tests.openChild",
				title: "",
				arguments: [child.id]
			};
			childs[index] = item;
			index++;
		}
		return childs;
	}
}

function RenderTestWebwiew(path, detail) {
	let EscapeSwig = new swig.Swig({
		autoescape: false
	});
	global.EscapeSwig = EscapeSwig;
	return EscapeSwig.renderFile(path, detail);
}
/**
 * @param {vscode.ExtensionContext} context
 */
const saveSlove = async (content, id) => await fetch("https://noip.belledu.com/api/problem/problemSave", {
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
async function activate(context) {
	let showLoginBox = async () => {
		let account = await vscode.window.showInputBox({
			title: "请输入账号"
		})
		let password = await vscode.window.showInputBox({
			title: "请输入密码",
			password: true
		})
		let orgType = await (await Auth.getOrgType()).json();

		let typesPick = ["会员"];
		for (let item of orgType.data.orgTypeEnums) {

			typesPick.push(item.desc);
		}

		let accountType = await vscode.window.showQuickPick(typesPick, {
			canPickMany: false,
			title: "账号类型"
		})
		let loginReturn;
		if (accountType === "会员") {
			loginReturn = await Auth.login(account, password, 1);
		}
		else {
			for (let item of orgType.data.orgTypeEnums) {
				if (item.desc === accountType) {
					loginReturn = await Auth.login(account, password, 2, item.value);
					break;
				}
			}
		}
		if (loginReturn.status != 200)
			vscode.window.showInformationMessage(loginReturn.message);
		else {
			vscode.window.showInformationMessage("登陆成功");
			context.globalState.update("authKey", Auth.getKey());
		}
	};
	vscode.commands.registerCommand("belledu.login", showLoginBox);
	let GetKey = await context.globalState.get("authKey");
	if (GetKey != undefined) {
		Auth.setKey(GetKey);
	}
	if (Auth.getKey() != undefined) {
		let checkLogin = await (await Auth.checkLoginPassword()).json();
		if (checkLogin.status != 200) {
			vscode.window.showInformationMessage(checkLogin.message);
		}
	}
	const treeNodeProvider = new TreeNodeProvider();
	vscode.window.createTreeView('sidebar_testing', {
		treeDataProvider: treeNodeProvider
	});
	vscode.commands.registerCommand("belledu.nextPage", () => {
		if (RequestProblemsMax >= ProblemListPages * 50) {
			ProblemListPages++;
			treeNodeProvider.refresh();
		}
	});
	vscode.commands.registerCommand("belledu.providePage", () => {
		if (ProblemListPages > 1) {
			ProblemListPages--;
			treeNodeProvider.refresh();
		}
	});
	vscode.commands.registerCommand("belledu_sidebar_tests.openChild", async args => {
		let panel = vscode.window.createWebviewPanel(
			"belledu.viewTestDetailPanel",
			"",
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);
		let showTestsDetail = async function () {
			let testDetail = (await (await fetch("https://noip.belledu.com/api/problem/problemDetail?problemId=" + args, {
				"credentials": "include",
				"headers": {
					...Auth.AuthHander, "Authorization": Auth.getKey()
				},
				"referrer": "https://noip.belledu.com/",
				"method": "GET",
				"mode": "cors"
			})).json()).data;
			panel.title = testDetail.title;
			panel.webview.html = RenderTestWebwiew(path.join(context.extensionPath, "webview_tests_template.html"), {
				description: testDetail.description,
				inputDescription: testDetail.inputDescription,
				outputDescription: testDetail.outputDescription,
				samples: (testDetail.samples === undefined) ? undefined : eval(testDetail.samples),
				hint: testDetail.hint
			});
			return testDetail;
		};
		let detail = await showTestsDetail();
		const doc = await vscode.workspace.openTextDocument({ language: "cpp", content: ((detail.lastSubmission) ? detail.lastSubmission.code : "") });
		await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Two });
		panel.webview.onDidReceiveMessage(async function (data) {
			if (data.action === "save") {
				let res = await (await saveSlove(doc.getText(), Number(args))).json();
				vscode.window.showInformationMessage(res.message);
			}
		});
	});
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
