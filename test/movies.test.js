import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import User from "../userModel.js";
import { connect, closeDatabase } from "../test-units/db-handler.js";

let ownerToken = "";
let otherToken = "";
let movieId = "";

const sampleMovie = {
  MovieTitle: "Vikram",
  Director: "Lokesh Kanagaraj",
  Starring: ["Kamal Haasan", "Vijay Sethupathi"],
  Quality: "HD",
  Genres: ["Action", "Thriller"],
  Language: "Tamil",
  Movie_Rating: 8.4,
  Release_Date: "2022-06-03",
};

beforeAll(async () => {
  await connect();
  await User.init();

  await request(app).post("/signup").send({
    username: "owner",
    email: "owner@gmail.com",
    password: "owner1234",
  });

  await request(app).post("/signup").send({
    username: "intruder",
    email: "intruder@gmail.com",
    password: "intruder1234",
  });

  const ownerLogin = await request(app).post("/login").send({
    email: "owner@gmail.com",
    password: "owner1234",
  });
  ownerToken = ownerLogin.body.token;

  const otherLogin = await request(app).post("/login").send({
    email: "intruder@gmail.com",
    password: "intruder1234",
  });
  otherToken = otherLogin.body.token;
});

afterAll(async () => {
  await closeDatabase();
});

describe("POST /movies", () => {
  it("should create a movie for the logged-in user", async () => {
    const res = await request(app)
      .post("/movies")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(sampleMovie);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.MovieTitle).toBe(sampleMovie.MovieTitle);

    movieId = res.body.data._id;
  });

  it("should reject a request with no token", async () => {
    const res = await request(app).post("/movies").send(sampleMovie);

    expect(res.status).toBe(401);
  });

  it("should reject a movie missing required fields", async () => {
    const res = await request(app)
      .post("/movies")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ MovieTitle: "Incomplete Movie" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /movies/:id", () => {
  it("should update the movie when the owner sends valid data", async () => {
    const res = await request(app)
      .put(`/movies/${movieId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ Movie_Rating: 9 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.Movie_Rating).toBe(9);
  });

  it("should reject an invalid movie id format", async () => {
    const res = await request(app)
      .put("/movies/not-a-valid-id")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ Movie_Rating: 5 });

    expect(res.status).toBe(400);
  });

  it("should return 404 for a well-formed id that doesn't exist", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .put(`/movies/${fakeId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ Movie_Rating: 5 });

    expect(res.status).toBe(404);
  });

  it("should reject an update from a user who doesn't own the movie", async () => {
    const res = await request(app)
      .put(`/movies/${movieId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ Movie_Rating: 1 });

    expect(res.status).toBe(403);
  });

  it("should reject a request with no token", async () => {
    const res = await request(app)
      .put(`/movies/${movieId}`)
      .send({ Movie_Rating: 5 });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /movies/:id", () => {
  it("should reject an invalid movie id format", async () => {
    const res = await request(app)
      .delete("/movies/not-a-valid-id")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
  });

  it("should reject a delete from a user who doesn't own the movie", async () => {
    const res = await request(app)
      .delete(`/movies/${movieId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("should reject a request with no token", async () => {
    const res = await request(app).delete(`/movies/${movieId}`);

    expect(res.status).toBe(401);
  });

  it("should delete the movie when the owner requests it", async () => {
    const res = await request(app)
      .delete(`/movies/${movieId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 404 when deleting an already-deleted movie", async () => {
    const res = await request(app)
      .delete(`/movies/${movieId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });
});
