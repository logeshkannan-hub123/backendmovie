import app from "./app.js";
import { connectDB } from "./database.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server Running on ${PORT}`);
  });
}

startServer();
