import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "others"],
    },

    dob: Date,

    dod: Date,

    deathCause: String,

    isAlive: {
      type: Boolean,
      default: true,
    },

    placeOfBirth: String,

    photoId: String,

    photoURL: {
      type: String,
      default: null,
    },

    father: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
    },

    mother: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
    },

    spouses: [
      {
        spouse: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Member",
        },

        status: {
          type: String,
          enum: ["married", "divorced", "widowed", "partner"],
          default: "married",
        },

        marriageDate: Date,

        divorceDate: Date,
      },
    ],

    children: [
      {
        type: mongoose.Schema.Types.ObjectId,

        ref: "Member",
      },
    ],

    bio: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

/* FIXED middleware */

memberSchema.pre("save", function () {
  if (this.dod || this.deathCause) {
    this.isAlive = false;
  }
});

// memberSchema.pre("findOneAndUpdate", function () {
//   const update = this.getUpdate();

//   if (update?.dod || update?.deathCause) {
//     update.isAlive = false;
//   }
// });

export default mongoose.model("Member", memberSchema);
