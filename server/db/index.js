require("dotenv").config();
const mongoose = require("mongoose");

const connectMongoDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn; // Ensure you return the connection object for further use if needed
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit the process if the connection fails
  }
};

// Call the function and handle the promise
connectMongoDB()
  .then((conn) => {
    const dbName = conn.connection.db.databaseName; // Correct way to get the DB name
    console.log(`Connected to Mongo! Database name: "${dbName}"`);
  })
  .catch((err) => {
    console.error("Error connecting to Mongo:", err);
  });
