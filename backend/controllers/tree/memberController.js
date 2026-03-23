import Member from "../../models/memberModel.js";
import path from "path";
import fs from "fs";

const parseJSON = (value, fallback = []) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

/** Bidirectional: add child to parent's children array */
async function linkChildToParent(parentId, childId) {
  if (!parentId || !childId) return;
  await Member.findByIdAndUpdate(parentId, {
    $addToSet: { children: childId },
  });
}

/** Bidirectional: remove child from parent's children array */
async function unlinkChildFromParent(parentId, childId) {
  if (!parentId || !childId) return;
  await Member.findByIdAndUpdate(parentId, {
    $pull: { children: childId },
  });
}

/** Bidirectional: add spouse link on both members */
async function linkSpouse(memberId, spouseId, status) {
  await Member.findByIdAndUpdate(memberId, {
    $addToSet: { spouses: { spouse: spouseId, status } },
  });
  await Member.findByIdAndUpdate(spouseId, {
    $addToSet: { spouses: { spouse: memberId, status } },
  });
}

/** Bidirectional: remove spouse link from both members */
async function unlinkSpouse(memberId, spouseId) {
  await Member.findByIdAndUpdate(memberId, {
    $pull: { spouses: { spouse: spouseId } },
  });
  await Member.findByIdAndUpdate(spouseId, {
    $pull: { spouses: { spouse: memberId } },
  });
}

/* ═══════════════════════════════════════
   CREATE MEMBER
═══════════════════════════════════════ */
export const createMember = async (req, res) => {
  try {
    const {
      firstName, lastName, gender, dob, dod, deathCause,
      isAlive, placeOfBirth, bio, createdBy,
      father, mother,
    } = req.body;

    const spousesRaw  = parseJSON(req.body.spouses, []);
    const childrenRaw = parseJSON(req.body.children, []);

    // Photo
    const photoURL = req.file
      ? req.file.path.replace(/\\/g, "/")
      : undefined;

    // Create member
    const member = await Member.create({
      firstName, lastName, gender,
      dob: dob || undefined,
      dod: dod || undefined,
      deathCause: deathCause || undefined,
      isAlive: String(isAlive) === "false" ? false : true,
      placeOfBirth: placeOfBirth || undefined,
      bio: bio || undefined,
      photoURL,
      father: father || undefined,
      mother: mother || undefined,
      createdBy,
    });

    const memberId = member._id;

    // Sync: father / mother
    if (father) await linkChildToParent(father, memberId);
    if (mother) await linkChildToParent(mother, memberId);

    // Sync: spouses
    for (const sp of spousesRaw) {
      await linkSpouse(memberId, sp.spouse, sp.status || "married");
    }
    // Store spouses on this member too
    member.spouses = spousesRaw.map((s) => ({ spouse: s.spouse, status: s.status || "married" }));

    // Sync: children (set father/mother on each child)
    for (const childId of childrenRaw) {
      if (gender === "male") {
        await Member.findByIdAndUpdate(childId, { father: memberId });
      } else if (gender === "female") {
        await Member.findByIdAndUpdate(childId, { mother: memberId });
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
    console.error("createMember error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ═══════════════════════════════════════
   GET ALL MEMBERS (for a user/tree)
═══════════════════════════════════════ */
export const getMembers = async (req, res) => {
  try {
    const members = await Member.find({ createdBy: req.user.id })
      .populate("father", "firstName lastName gender photoURL")
      .populate("mother", "firstName lastName gender photoURL")
      .populate("spouses.spouse", "firstName lastName gender photoURL")
      .populate("children", "firstName lastName gender photoURL")
      .sort({ createdAt: 1 });

    return res.status(200).json({ success: true, data: members });
  } catch (err) {
    console.error("getMembers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ═══════════════════════════════════════
   GET SINGLE MEMBER
═══════════════════════════════════════ */
export const getMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate("father", "firstName lastName gender photoURL dob")
      .populate("mother", "firstName lastName gender photoURL dob")
      .populate("spouses.spouse", "firstName lastName gender photoURL dob")
      .populate("children", "firstName lastName gender photoURL dob");

    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    return res.status(200).json({ success: true, data: member });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ═══════════════════════════════════════
   UPDATE MEMBER (with relation diff)
═══════════════════════════════════════ */
export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Member.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Member not found" });

    const {
      firstName, lastName, gender, dob, dod, deathCause,
      isAlive, placeOfBirth, bio,
      father, mother,
    } = req.body;

    const newSpouses  = parseJSON(req.body.spouses, []);
    const newChildren = parseJSON(req.body.children, []);

    /* ── Father ── */
    const oldFatherId = existing.father?.toString();
    const newFatherId = father || null;
    if (oldFatherId !== newFatherId) {
      if (oldFatherId) await unlinkChildFromParent(oldFatherId, id);
      if (newFatherId) await linkChildToParent(newFatherId, id);
    }

    /* ── Mother ── */
    const oldMotherId = existing.mother?.toString();
    const newMotherId = mother || null;
    if (oldMotherId !== newMotherId) {
      if (oldMotherId) await unlinkChildFromParent(oldMotherId, id);
      if (newMotherId) await linkChildToParent(newMotherId, id);
    }

    /* ── Spouses ── */
    const oldSpouseIds = (existing.spouses || []).map((s) => s.spouse?.toString());
    const newSpouseIds = newSpouses.map((s) => s.spouse?.toString() || s.spouse);

    // Remove old spouses not in new list
    for (const oldId of oldSpouseIds) {
      if (!newSpouseIds.includes(oldId)) await unlinkSpouse(id, oldId);
    }
    // Add new spouses not in old list
    for (const sp of newSpouses) {
      const spId = sp.spouse?.toString() || sp.spouse;
      if (!oldSpouseIds.includes(spId)) {
        await linkSpouse(id, spId, sp.status || "married");
      } else {
        // Update status if changed
        await Member.updateOne(
          { _id: id, "spouses.spouse": spId },
          { $set: { "spouses.$.status": sp.status || "married" } }
        );
        await Member.updateOne(
          { _id: spId, "spouses.spouse": id },
          { $set: { "spouses.$.status": sp.status || "married" } }
        );
      }
    }

    /* ── Children ── */
    const oldChildIds = (existing.children || []).map((c) => c?.toString());
    const newChildIdsStr = newChildren.map((c) => c?.toString() || c);

    // Remove removed children
    for (const oldCId of oldChildIds) {
      if (!newChildIdsStr.includes(oldCId)) {
        const childGenderField = gender === "male" ? "father" : "mother";
        await Member.findByIdAndUpdate(oldCId, { [childGenderField]: null });
      }
    }
    // Add new children
    for (const cId of newChildIdsStr) {
      if (!oldChildIds.includes(cId)) {
        const childGenderField = gender === "male" ? "father" : "mother";
        await Member.findByIdAndUpdate(cId, { [childGenderField]: id });
      }
    }

    /* ── Photo ── */
    let photoURL = existing.photoURL;
    if (req.file) {
      // Delete old photo if it's not the default
      if (existing.photoURL && !existing.photoURL.includes("default.jpg")) {
        const oldPath = path.resolve(existing.photoURL);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photoURL = req.file.path.replace(/\\/g, "/");
    }

    /* ── Save ── */
    const updated = await Member.findByIdAndUpdate(
      id,
      {
        firstName, lastName, gender,
        dob: dob || null,
        dod: dod || null,
        deathCause: deathCause || null,
        isAlive: String(isAlive) === "false" ? false : true,
        placeOfBirth: placeOfBirth || "",
        bio: bio || "",
        photoURL,
        father: newFatherId,
        mother: newMotherId,
        spouses: newSpouses.map((s) => ({
          spouse: s.spouse,
          status: s.status || "married",
        })),
        children: newChildIdsStr,
      },
      { new: true, runValidators: true }
    )
      .populate("father", "firstName lastName gender photoURL")
      .populate("mother", "firstName lastName gender photoURL")
      .populate("spouses.spouse", "firstName lastName gender photoURL")
      .populate("children", "firstName lastName gender photoURL");

    return res.status(200).json({ success: true, message: "Member updated", data: updated });
  } catch (err) {
    console.error("updateMember error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ═══════════════════════════════════════
   DELETE MEMBER (clean all relations)
═══════════════════════════════════════ */
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findById(id);
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    // Remove from others' children lists
    if (member.father) await unlinkChildFromParent(member.father, id);
    if (member.mother) await unlinkChildFromParent(member.mother, id);

    // Remove spouse links
    for (const sp of member.spouses || []) {
      await unlinkSpouse(id, sp.spouse);
    }

    // Orphan children (remove this member as father/mother)
    const field = member.gender === "male" ? "father" : "mother";
    await Member.updateMany(
      { [field]: id },
      { $unset: { [field]: "" } }
    );

    // Delete photo file
    if (member.photoURL && !member.photoURL.includes("default.jpg")) {
      const filePath = path.resolve(member.photoURL);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Member.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Member deleted" });
  } catch (err) {
    console.error("deleteMember error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};