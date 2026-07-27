import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    MovieTitle: {
      type: String,
      required: true,
      trim: true,
    },

    Director: {
      type: String,
      required: true,
      trim: true,
    },

    Starring: [
      {
        type: String,
        required: true,
      },
    ],

    Quality: {
      type: String,
      required: true,
    },

    Genres: [
      {
        type: String,
        required: true,
      },
    ],

    Language: {
      type: String,
      required: true,
    },

    Movie_Rating: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },

    Release_Date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model("Movie", movieSchema);
