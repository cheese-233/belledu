const vscode = require('vscode');
const Auth = require('./api/auth');
const TestApi = require('./api/tests');
const swig = require('swig');
const path = require('path');

function RenderTestWebwiew(path, testDetail) {
	let EscapeSwig = new swig.Swig({
		autoescape: false
	});
	global.EscapeSwig = EscapeSwig;
	return EscapeSwig.renderFile(path, testDetail);
}
/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	let GetKey = await context.globalState.get("authKey");
	if (GetKey != undefined) {
		Auth.setKey(GetKey);
	}
	let showLoginBox = async () => {
		if (Auth.getKey() != undefined) {
			let isLogout = await vscode.window.showInformationMessage("是否要退出登录?", "是", "否");
			if (isLogout == "是") {
				await context.globalState.update("authKey", undefined);
				vscode.commands.executeCommand("workbench.action.reloadWindow");
			}
			return;
		}
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
			await context.globalState.update("authKey", Auth.getKey());
			vscode.commands.executeCommand("workbench.action.reloadWindow");
		}
	};
	vscode.commands.registerCommand("belledu.login", showLoginBox);
	const isLogin = async () => {
		if (Auth.getKey() != undefined) {
			let checkLogin = await (await Auth.checkLoginPassword()).json();
			if (checkLogin.status != 200) {
				vscode.window.showWarningMessage(checkLogin.message);
				context.globalState.update("authKey", undefined);
				return false;
			}
			return true;
		}
		else {
			vscode.window.showErrorMessage("未登录!");
			return false;
		}
	}
	class TestsEntryItem extends vscode.TreeItem {

	}
	let ProblemListPages = 1;
	let RequestProblemsMax = 0;
	const requestProblemList = async () => {
		let a = await TestApi.problemList(ProblemListPages);
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
			if (!await isLogin()) {
				return;
			}
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
					arguments: [child.id, child.code]
				};
				childs[index] = item;
				index++;
			}
			return childs;
		}
	}
	const treeNodeProvider = new TreeNodeProvider();
	vscode.window.createTreeView('sidebar_testing', {
		treeDataProvider: treeNodeProvider
	});
	vscode.commands.registerCommand("belledu.nextPage", async () => {
		if (!await isLogin()) {
			return;
		}
		if (RequestProblemsMax >= ProblemListPages * 50) {
			ProblemListPages++;
			treeNodeProvider.refresh();
		}
	});
	vscode.commands.registerCommand("belledu.providePage", async () => {
		if (!await isLogin()) {
			return;
		}
		if (ProblemListPages > 1) {
			ProblemListPages--;
			treeNodeProvider.refresh();
		}
	});
	vscode.commands.registerCommand("belledu_sidebar_tests.openChild", async (args, testCode) => {
		if (!await isLogin()) {
			return;
		}
		let panel = vscode.window.createWebviewPanel(
			"belledu.viewTestDetailPanel",
			"",
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);
		let testDetail = (await (await TestApi.getTestDetails(args)).json()).data;
		let showTestsDetail = async function () {
			panel.title = testDetail.title;
			panel.webview.html = RenderTestWebwiew(path.join(context.extensionPath, "templates/webview_tests.html"), {
				description: testDetail.description,
				inputDescription: testDetail.inputDescription,
				outputDescription: testDetail.outputDescription,
				samples: (testDetail.samples === undefined) ? undefined : eval(testDetail.samples),
				hint: testDetail.hint
			});
		};
		let showSubmitSloveDetail = function (uuid) {
			let submitPanel = vscode.window.createWebviewPanel(
				"belledu.viewSubmitSlovePanel",
				"判题结果",
				vscode.ViewColumn.Active,
				{
					enableScripts: true,
					retainContextWhenHidden: true

				}
			);
			submitPanel.webview.html = RenderTestWebwiew(path.join(context.extensionPath, "templates/webview_tests_submit.html"), {
				success: false
			});
			const setEndHTML = setInterval(async () => {
				let submitQuery = await (await TestApi.querySloveResult(uuid)).json();
				if (submitQuery.data.isResult) {
					let resultUrl = await TestApi.getSloveResultUrl(testCode);
					submitPanel.webview.html = RenderTestWebwiew(path.join(context.extensionPath, "templates/webview_tests_submit.html"), {
						success: true, problemId: resultUrl.data.data[0].id
					});
					clearInterval(setEndHTML);
				}
			}, 500);
		}
		await showTestsDetail();
		const docSetting = { language: "cpp", content: ((testDetail.lastSubmission) ? testDetail.lastSubmission.code : "") };
		let doc;
		let activeEditor = undefined;
		const openDoc = async () => {
			if (activeEditor) {
				let isNewWindow = await vscode.window.showInformationMessage("是否要使用当前激活的编辑页面?", "是", "否");
				if (isNewWindow == "是") {
					doc = activeEditor.document;
					return;
				}
			}
			doc = await vscode.workspace.openTextDocument(docSetting);
			await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Two });
		}
		await openDoc();
		const isOpen = () => {
			if (doc.isClosed) {
				vscode.window.showWarningMessage("请先打开编辑页面！");
			}
			return !doc.isClosed;
		}
		let testPanel;
		let showTestSloveDetail = function (chooseInput, res) {
			if (chooseInput) {
				testPanel = vscode.window.createWebviewPanel(
					"belledu.viewTestSlovePanel",
					"测试",
					vscode.ViewColumn.Active,
					{
						enableScripts: true,
						retainContextWhenHidden: true

					}
				);
				testPanel.webview.html = RenderTestWebwiew(path.join(context.extensionPath, "templates/webview_tests_testOutput.html"), {
					samples: (testDetail.samples === undefined) ? undefined : eval(testDetail.samples),
					chooseInput: chooseInput
				});
				testPanel.webview.onDidReceiveMessage(async function (data) {
					if (isOpen()) {
						let res = await (await TestApi.testSlove(doc.getText(), data.testData, Number(args))).json();
						showTestSloveDetail(false, res);
					}
				});
			}
			else {
				testPanel.webview.html = RenderTestWebwiew(path.join(context.extensionPath, "templates/webview_tests_testOutput.html"), {
					time: res.data.time,
					memory: Number(res.data.memory) / 1000,
					content: (res.data.error === undefined) ? res.data.output : res.data.error,
					samples: (testDetail.samples === undefined) ? undefined : eval(testDetail.samples),
					chooseInput: chooseInput
				});
			}
			return testPanel;
		}
		panel.webview.onDidReceiveMessage(async function (data) {
			switch (data.action) {
				case "reopen":
					if (doc.isClosed) {
						await openDoc();
					}
					break;
				case "reopenHover":
					activeEditor = vscode.window.activeTextEditor;
					break;
				case "save":
					if (isOpen()) {
						let res = await (await TestApi.saveSlove(doc.getText(), Number(args))).json();
						vscode.window.showInformationMessage(res.message);
					}
					break;
				case "test":
					if (isOpen()) {
						showTestSloveDetail(true);
					}
					break;
				case "submit":
					if (isOpen()) {
						let submit = await (await TestApi.submitSlove(doc.getText(), Number(args))).json();
						let submitUUID = submit.data.uuid;
						showSubmitSloveDetail(submitUUID);
					}
					break;
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
