/*global QUnit*/
import Controller from "bjmproject/controller/ViewReport.controller";

QUnit.module("ViewReport Controller");

QUnit.test("I should test the ViewReport controller", function (assert: Assert) {
	const oAppController = new Controller("ViewReport");
	oAppController.onInit();
	assert.ok(oAppController);
});