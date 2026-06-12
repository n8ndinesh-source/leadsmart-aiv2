import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "leadsmart-super-secret-key";

export async function signup(req: Request, res: Response): Promise<any> {
  try {
    const { companyName, name, email, password, confirmPassword, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const assignedRole = role === "ADMIN" ? "ADMIN" : "CLIENT";

    if (assignedRole === "CLIENT" && !companyName) {
      return res.status(400).json({ error: "Company name is required for client accounts" });
    }

    // Checking if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and client record in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: assignedRole,
        },
      });

      if (assignedRole === "CLIENT") {
        await tx.client.create({
          data: {
            userId: user.id,
            companyName,
            subscriptionStatus: "TRIAL", // Default Subscription
          },
        });
      }

      return user;
    });

    // Create JWT Token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Server error during registration. Please try again." });
  }
}

export async function login(req: Request, res: Response): Promise<any> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { client: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Create JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.client?.companyName || null,
        subscriptionStatus: user.client?.subscriptionStatus || null,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error during login: " + error.message });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<any> {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email target is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return 200 security wise or 400 for demo; let's say successful in both cases to match UI simulation
      return res.status(404).json({ error: "No user found with this email" });
    }

    // Simulate sending password reset link
    console.log(`Password reset link simulated for user: ${email}`);

    return res.json({
      message: "Reset link has been sent. Please check your email inbox.",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Server error during reset link creation." });
  }
}
