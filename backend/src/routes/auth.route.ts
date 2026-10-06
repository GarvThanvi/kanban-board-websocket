import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

const singUpSchema = z.object({
  email: z.email("Invalid email format."),
  password: z.string().min(8, "Password must be atleast 8 characters long."),
  name: z.string().min(5, "Name must be atleast 5 characters."),
});
type SignUp = z.infer<typeof singUpSchema>;

const signInSchema = z.object({
  email: z.email("Invalid email format."),
  password: z.string().min(8, "Password must be atleast 8 characters long."),
});
type SignIn = z.infer<typeof signInSchema>;

router.post("/signup", async (req, res) => {
  try {
    const result = singUpSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }
    const signUpData: SignUp = result.data!;
    const user = await prisma.user.findUnique({
      where: {
        email: signUpData.email,
      },
    });
    if (user) {
      return res.status(409).json({
        success: false,
        message: "Email already exists, please sign in",
      });
    }

    const hashedPassword = await bcrypt.hash(signUpData.password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: signUpData.email,
        password: hashedPassword,
        name: signUpData.name,
      },
    });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, name: newUser.name },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      token,
      data: {
        name: newUser.name,
        email: newUser.email,
        id: newUser.id,
      },
    });
  } catch (error) {
    console.error("Server error while signingup ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const result = signInSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }
    const signInData: SignIn = result.data!;
    const user = await prisma.user.findUnique({
      where: {
        email: signInData.email,
      },
    });
    if (!user) {
      return res.status(409).json({
        success: false,
        message: "No such email exists, please signup",
      });
    }

    const isMatch = await bcrypt.compare(signInData.password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );
    return res.status(200).json({
      success: true,
      token,
      data: {
        name: user.name,
        email: user.email,
        id: user.id,
      },
    });
  } catch (error) {
    console.error("Server error while signingin ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
});

export default router;
