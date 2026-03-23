// memberRoutes.js
// Mount at: app.use('/api/tree', memberRoutes)

import express from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import {
  createMember,
  getMembers,
  getMember,
  updateMember,
  deleteMember,
} from "../controllers/tree/memberController.js";

import { protect } from "../middlewares/authMiddleware.js"; // your JWT guard

const router = express.Router();

/* ─── Multer config ─── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `member-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

/* ─── Routes ─── */
router.get("/members",           protect, getMembers);
router.post("/members",          protect, upload.single("photo"), createMember);
router.get("/members/:id",       protect, getMember);
router.put("/members/:id",       protect, upload.single("photo"), updateMember);
router.delete("/members/:id",    protect, deleteMember);

export default router;