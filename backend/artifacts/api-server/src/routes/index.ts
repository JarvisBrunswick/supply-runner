import { Router, type IRouter } from "express";
import healthRouter from "./health";
import materialsRouter from "./materials";
import ordersRouter from "./orders";
import deliveryFeesRouter from "./deliveryFees";

const router: IRouter = Router();

router.use(healthRouter);
router.use(materialsRouter);
router.use(ordersRouter);
router.use(deliveryFeesRouter);

export default router;
