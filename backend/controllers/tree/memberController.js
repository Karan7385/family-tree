import Member from "../../models/memberModel.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../../cloudinaryFileService.js";

/* ───────────────────────────── */

const parseJSON = (value, fallback = []) => {
  if (!value) return fallback;

  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/* ───────────────────────────── */

async function linkChildToParent(parentId, childId) {
  if (!parentId || !childId) return;

  await Member.findByIdAndUpdate(
    parentId,

    {
      $addToSet: {
        children: childId,
      },
    },
  );
}

/* ───────────────────────────── */

async function unlinkChildFromParent(parentId, childId) {
  if (!parentId || !childId) return;

  await Member.findByIdAndUpdate(
    parentId,

    {
      $pull: {
        children: childId,
      },
    },
  );
}

/* ───────────────────────────── */

async function linkSpouse(memberId, spouseId, status) {
  await Member.findByIdAndUpdate(
    memberId,

    {
      $addToSet: {
        spouses: {
          spouse: spouseId,
          status,
        },
      },
    },
  );

  await Member.findByIdAndUpdate(
    spouseId,

    {
      $addToSet: {
        spouses: {
          spouse: memberId,
          status,
        },
      },
    },
  );
}

/* ───────────────────────────── */

async function unlinkSpouse(memberId, spouseId) {
  await Member.findByIdAndUpdate(
    memberId,

    {
      $pull: {
        spouses: {
          spouse: spouseId,
        },
      },
    },
  );

  await Member.findByIdAndUpdate(
    spouseId,

    {
      $pull: {
        spouses: {
          spouse: memberId,
        },
      },
    },
  );
}

/* ═══════════════════════════════
   CREATE MEMBER
═══════════════════════════════ */

export const createMember = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      dob,
      dod,
      deathCause,
      isAlive,
      placeOfBirth,
      bio,
      createdBy,
      father,
      mother,
    } = req.body;

    const spousesRaw = parseJSON(req.body.spouses);

    const childrenRaw = parseJSON(req.body.children);

    /* PHOTO */

    let photoURL = null;

    let photoId = null;

    if (req.file) {
      const result = await uploadToCloudinary(req.file);

      photoURL = result.url;
      photoId = result.public_id;
    }

    /* CREATE */

    const member = await Member.create({
      firstName,

      lastName,

      gender,

      dob: dob || null,

      dod: dod || null,

      deathCause: deathCause || null,

      isAlive: String(isAlive) === "false" ? false : true,

      placeOfBirth: placeOfBirth || "",

      bio: bio || "",

      photoURL,

      photoId,

      father: father || null,

      mother: mother || null,

      createdBy,
    });

    const memberId = member._id;

    /* RELATIONS */

    if (father) await linkChildToParent(father, memberId);

    if (mother) await linkChildToParent(mother, memberId);

    /* SPOUSES */

    for (const sp of spousesRaw) {
      await linkSpouse(
        memberId,

        sp.spouse,

        sp.status || "married",
      );
    }

    member.spouses = spousesRaw.map((s) => ({
      spouse: s.spouse,

      status: s.status || "married",
    }));

    /* CHILDREN */

    for (const childId of childrenRaw) {
      if (gender === "male") {
        await Member.findByIdAndUpdate(
          childId,

          {
            father: memberId,
          },
        );
      }

      if (gender === "female") {
        await Member.findByIdAndUpdate(
          childId,

          {
            mother: memberId,
          },
        );
      }

      member.children.addToSet(childId);
    }

    await member.save();

    return res.status(201).json({
      success: true,

      message: "Member created",

      data: member,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,

      message: "Server error",
    });
  }
};

/* ═══════════════════════════════
   GET MEMBERS
═══════════════════════════════ */

export const getMembers = async (req, res) => {
  console.log(req.user);
  try {
    const members = await Member.find({
      createdBy: req.user.id,
    })

      .populate("father", "firstName lastName gender photoURL")

      .populate("mother", "firstName lastName gender photoURL")

      .populate("spouses.spouse", "firstName lastName gender photoURL")

      .populate("children", "firstName lastName gender photoURL")

      .sort({ createdAt: 1 });

    res.json({
      success: true,

      data: members,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
    });
  }
};

/* ═══════════════════════════════
   GET MEMBER
═══════════════════════════════ */

export const getMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)

      .populate("father", "firstName lastName gender photoURL")

      .populate("mother", "firstName lastName gender photoURL")

      .populate("spouses.spouse", "firstName lastName gender photoURL")

      .populate("children", "firstName lastName gender photoURL");

    if (!member)
      return res.status(404).json({
        success: false,

        message: "Member not found",
      });

    res.json({
      success: true,

      data: member,
    });
  } catch {
    res.status(500).json({
      success: false,
    });
  }
};

/* ═══════════════════════════════
   UPDATE MEMBER
═══════════════════════════════ */

export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Member.findById(id);

    if (!existing)
      return res.status(404).json({
        success: false,
      });

    /* PHOTO */

    let photoURL = existing.photoURL;

    let photoId = existing.photoId;

    if (req.file) {
      if (photoId) {
        await deleteFromCloudinary(photoId);
      }

      const result = await uploadToCloudinary(req.file);

      photoURL = result.url;

      photoId = result.fileId;
    }

    /* UPDATE */

    const updated = await Member.findByIdAndUpdate(
      id,

      {
        ...req.body,

        photoURL,

        photoId,
      },

      {
        new: true,

        runValidators: true,
      },
    )

      .populate("father", "firstName lastName")

      .populate("mother", "firstName lastName")

      .populate("spouses.spouse", "firstName lastName")

      .populate("children", "firstName lastName");

    res.json({
      success: true,

      message: "Member updated",

      data: updated,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
    });
  }
};

/* ═══════════════════════════════
   DELETE MEMBER
═══════════════════════════════ */

export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findById(id);

    if (!member)
      return res.status(404).json({
        success: false,
      });

    /* DELETE PHOTO */

    if (member.photoId) {
      await deleteFromCloudinary(member.photoId);
    }

    /* CLEAN RELATIONS */

    if (member.father)
      await unlinkChildFromParent(
        member.father,

        id,
      );

    if (member.mother)
      await unlinkChildFromParent(
        member.mother,

        id,
      );

    for (const sp of member.spouses) {
      await unlinkSpouse(
        id,

        sp.spouse,
      );
    }

    await Member.findByIdAndDelete(id);

    res.json({
      success: true,

      message: "Member deleted",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
    });
  }
};
