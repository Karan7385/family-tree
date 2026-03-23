import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: {
        values: ["male", "female", "others"],
        message: "{VALUE} is not a valid gender option",
      },
    },
    dob: {
      type: Date,
      required: false
    },
    dod: {
      type: Date,
      required: false,
    },
    deathCause: {
      type: String,
      trim: true,
      required: false,
      maxLength: [200, "Death cause cannot exceed 200 characters"],
    },
    isAlive: {
      type: Boolean,
      default: true,
    },
    placeOfBirth: {
      type: String,
      required: false,
    },
    photoURL: {
      type: String,
      default: "uploads/default.jpg",
    },
    // --- ESSENTIAL FAMILY TREE ATTRIBUTES ---
    father: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    mother: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    spouses: [
      {
        spouse: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Member",
        },
        status: {
          type: String,
          enum: {
            values: ["married", "divorced", "widowed", "partner"],
            message: "{VALUE} is not a valid relationship status",
          },
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
    bio: {
      type: String,
      maxLength: [500, "Bio cannot exceed 500 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true },
);

// Middleware: Auto-update isAlive status
memberSchema.pre('save', function(next) {
    if (this.dod || this.deathCause) {
        this.isAlive = false;
    }
});

const Member = mongoose.model("Member", memberSchema);
export default Member;