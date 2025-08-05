const express = require("express");
const router = express.Router();
const loginController = require("../controlers/login");
const checkLoginController = require("../controlers/checkLogin");

router.post("/",loginController.login);
router.get("/nonce/:address",checkLoginController.checkLogin);



module.exports = router;