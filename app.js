import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import Movie from "./movie.model.js";
import User from "./userModel.js";
import requireAuth from "./auth.js";

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.AllOW_ORGIN }));
app.use(express.json());

/* =====================================
      CREATE USER
===================================== */

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Check username
    const usernameExists = await User.findOne({
      username: username.trim(),
    });

    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Check email
    const emailExists = await User.findOne({
      email: email.trim(),
    });

    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    // Duplicate key error (extra safety)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];

      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      });
    }

    // Validation error
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }

    // Log actual error only on server
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/* =====================================
      LOGIN
===================================== */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        user_id: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // console.log("token", token);

    res.json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET ALL MOVIES

app.get("/movies", requireAuth, async (req, res) => {
  try {
    const movies = await Movie.find({
      userId: req.user.user_id,
    });

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE MOVIE

app.post("/movies", requireAuth, async (req, res) => {
  try {
    const movie = await Movie.create({
      ...req.body,
      userId: req.user.user_id,
    });

    res.status(201).json({
      success: true,
      message: "Movie Added Successfully",
      data: movie,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});
// Validates the ObjectId, fetches the movie, and checks ownership.
// Returns { movie } on success or { error: { status, message } } on failure.
async function findOwnedMovie(id, userId) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: { status: 400, message: "Invalid Movie ID" } };
  }

  const movie = await Movie.findById(id);

  if (!movie) {
    return { error: { status: 404, message: "Movie not found" } };
  }

  if (String(movie.userId) !== userId) {
    return { error: { status: 403, message: "Not your movie" } };
  }

  return { movie };
}

// UPDATE MOVIE

app.put("/movies/:id", requireAuth, async (req, res) => {
  try {
    const { error } = await findOwnedMovie(req.params.id, req.user.user_id);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    const updatedMovie = await Movie.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Movie updated successfully",
      data: updatedMovie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE MOVIE

app.delete("/movies/:id", requireAuth, async (req, res) => {
  try {
    const { error } = await findOwnedMovie(req.params.id, req.user.user_id);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    await Movie.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Movie deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default app;
