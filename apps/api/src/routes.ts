import { Application, Request, Response } from "express";
import { env } from "./config/env";
import { errorMiddleware } from "./shared/middleware/error.middleware";
import { authRoutes } from "./features/auth/auth.routes";
import { userRoutes } from "./features/users/user.routes";
import { categoryRoutes } from "./features/categories/category.routes";
import { productRoutes } from "./features/products/product.routes";
import { supplierRoutes } from "./features/suppliers/supplier.routes";
import { orderRoutes } from "./features/orders/order.routes";
import { paymentRoutes } from "./features/payments/payment.routes";
import { uploadRoutes } from "./features/upload/upload.routes";
import { deliveryRoutes } from "./features/delivery/delivery.routes";
import { aiRoutes } from "./features/ai/ai.routes";
import { reviewRoutes } from "./features/reviews/review.routes";
import { opsRoutes } from "./features/ops/ops.routes";
import { createLocationRoutes } from "./features/locations/locations.routes";

// Mounts all feature routes plus the 404 and error handlers (which must come last).
// Kept separate from server.ts so tests can build the app without DB/Redis/listen.
export function registerRoutes(app: Application): void {
  const base = `/api/${env.API_VERSION}`;
  app.use(`${base}/auth`, authRoutes);
  app.use(`${base}/users`, userRoutes);
  app.use(`${base}/categories`, categoryRoutes);
  app.use(`${base}/products`, productRoutes);
  app.use(`${base}/suppliers`, supplierRoutes);
  app.use(`${base}/orders`, orderRoutes);
  app.use(`${base}/payments`, paymentRoutes);
  app.use(`${base}/upload`, uploadRoutes);
  app.use(`${base}/delivery`, deliveryRoutes);
  app.use(`${base}/ai`, aiRoutes);
  app.use(`${base}/reviews`, reviewRoutes);
  app.use(`${base}/ops`, opsRoutes);
  app.use(`${base}/locations`, createLocationRoutes());

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
  });
  app.use(errorMiddleware);
}
