require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const transaction = require("./routes/transaction");
const checkTransaction = require("./routes/checkTransaction");
const register = require("./routes/register");
const login = require("./routes/login");

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());


app.use("/transaction",transaction)
app.use("/checkTransaction",checkTransaction)
app.use("/register",register)
app.use("/login",login)



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});