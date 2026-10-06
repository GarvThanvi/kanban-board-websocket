import type { NextFunction, Request, Response } from "express";
import jwt, { type Jwt } from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  email: string;
}

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access denied. No token provided" });
  }

  try {
    const decoded: JwtPayload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Error validating jwt in middleware ", error);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

export const verifyTokenSocket = (token: string) => {
  if (!token) {
    throw new Error("No token provided");
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    return payload as { userId: string; name: string };
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};
