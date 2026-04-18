import { Router, type IRouter } from "express";
import healthRouter from "./health";
import materialsRouter from "./materials";
import ordersRouter from "./orders";
import deliveryFeesRouter from "./deliveryFees";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(materialsRouter);
router.use(ordersRouter);
router.use(deliveryFeesRouter);
router.use(paymentsRouter);

export default router;
