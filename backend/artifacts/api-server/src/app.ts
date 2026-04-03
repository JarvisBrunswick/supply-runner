import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

const API_KEY = process.env["API_SECRET_KEY"];

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (!API_KEY) {
    next();
    return;
  }
  const provided = req.headers["x-api-key"];
  if (provided !== API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

app.use("/api", router);

export default app;
