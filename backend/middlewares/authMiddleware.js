import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res
    .status(401)
    .json({ success: false, message: "Not authorized, please login" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
};
