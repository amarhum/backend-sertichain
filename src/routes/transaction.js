const express = require("express");
const router = express.Router();
const transactionControler = require("../controlers/transaction");
const upload = require("../middleware/upload");

router.post("/",upload.single('fileItems') ,transactionControler.sendTransaction);


module.exports = router;