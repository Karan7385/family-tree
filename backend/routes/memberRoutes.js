// memberRoutes.js
// Mount at: app.use('/api/tree', memberRoutes)

import express from "express";

import {
  createMember,
  getMembers,
  getMember,
  updateMember,
  deleteMember,
} from "../controllers/tree/memberController.js";

import { protect } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();


/* ─── Routes ─── */
router.get("/members",           getMembers);
router.post("/members",          upload.single("photo"), createMember);
router.get("/members/:id",       getMember);
router.put("/members/:id",       upload.single("photo"), updateMember);
router.delete("/members/:id",    deleteMember);

export default router;
