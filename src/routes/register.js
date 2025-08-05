const express = require("express");
const router = express.Router();
const registerControler = require("../controlers/register");

router.post("/",registerControler.register);



module.exports = router;