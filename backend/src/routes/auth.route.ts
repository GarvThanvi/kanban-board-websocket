import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/auth.middleware.ts";
import { generateShareToken } from "../utils/token.ts";
import { sendForgotPasswordEmail } from "../utils/email.ts";

const router = express.Router();

const singUpSchema = z.object({
  email: z.email("Invalid email format."),
  password: z.string().min(8, "Password must be atleast 8 characters long."),
  name: z.string().min(2, "Name must be at least 2 characters."),
});
type SignUp = z.infer<typeof singUpSchema>;

const signInSchema = z.object({
  email: z.email("Invalid email format."),
  password: z.string().min(8, "Password must be atleast 8 characters long."),
});
type SignIn = z.infer<typeof signInSchema>;

const forgotPasswordSchema = z.object({
  email: z.email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be atleast 8 characters long."),
});

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

    await prisma.boardInvitation.updateMany({
      where: {
        email: { equals: newUser.email, mode: "insensitive" },
        receiverId: null,
        status: "PENDING",
      },
      data: {
        receiverId: newUser.id,
      },
    });

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

router.get("/me", verifyToken, async (req, res) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      userData: { email: user.email, id: user.id, name: user.name },
    });
  } catch (error) {
    console.error("Error while getting user ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const { email } = result.data;

    const userExists = await prisma.user.findUnique({
      where: { email },
    });
    if (!userExists) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid user email address",
      });
    }

    const token: string = generateShareToken();
    const expiresAt: Date = new Date(Date.now() + 1000 * 60 * 60 * 2);

    await prisma.forgotPassword.create({
      data: {
        userId: userExists.id,
        token,
        expiresAt,
        emailSentAt: new Date(Date.now()),
      },
    });

    await sendForgotPasswordEmail(email, token);

    return res.status(200).json({ success: true, message: "Email sent" });
  } catch (error) {
    console.error("Error in forgot password route ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const result = await resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const { password, token } = result.data;

    const forgotPassword = await prisma.forgotPassword.findUnique({
      where: { token },
    });

    if (!forgotPassword || new Date(Date.now()) > forgotPassword?.expiresAt) {
      return res
        .status(404)
        .json({ success: false, message: "Token is invalid or expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: forgotPassword.userId },
      data: { password: hashedPassword },
    });

    await prisma.forgotPassword.deleteMany({
      where: { userId: forgotPassword.userId },
    });

    return res
      .status(200)
      .json({ success: true, message: "Successfully updated password" });
  } catch (error) {
    console.error("Error while reseting password", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

export default router;
