const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const checkTransactionControler = require("../controlers/checkTransaction");

router.post("/",upload.single('fileItems') ,checkTransactionControler.checkTransaction);



module.exports = router;