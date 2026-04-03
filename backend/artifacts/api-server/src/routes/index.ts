import { Router, type IRouter } from "express";
import healthRouter from "./health";
import materialsRouter from "./materials";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(materialsRouter);
router.use(ordersRouter);

export default router;
