const mongoose = require("mongoose");
const { createSpinner } = require("nanospinner");

const spinner = createSpinner("Connect to MongoDB");
let connectionFailed;

const connectMongoDB = () =>
  new Promise((resolve) => {
    mongoose
      .connect(process.env.DB_URI)
      .then((conn) => {
        const dbServer = `${conn.connection.host}:${conn.connection.port}`;
        resolve(dbServer);
      })
      .catch((error) => {
        if (!connectionFailed) {
          connectionFailed = true;
          spinner.error({ text: `MongoDB Connection Error: ${error}` });
        }
        setTimeout(() => {
          connectMongoDB()
            .then((conn) => resolve(conn))
            .catch((err) => console.log(err));
        }, 5000);
      });
  });

const dbConnection = async () => {
  let dbServer;

  spinner.start();

  mongoose.set("strictQuery", true);

  mongoose.connection.on("reconnected", () => {
    if (dbServer) spinner.success({ text: `MongoDB Reconnected: ${dbServer}` });
  });

  mongoose.connection.on("disconnected", () => {
    if (dbServer) spinner.error({ text: `MongoDB Disconnected: ${dbServer}` });
  });

  dbServer = await connectMongoDB();
  spinner.success({ text: `MongoDB Connected: ${dbServer}` });
};

module.exports = dbConnection;
