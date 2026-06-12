// ============================================================
// Routes — Auth
// ============================================================

import { Router } from "express";
import { register, login, getMe } from "../handlers/auth.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validation/schemas.js";

const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), register);
authRouter.post("/login", validateBody(loginSchema), login);
authRouter.get("/me", authenticate, getMe);

export { authRouter };