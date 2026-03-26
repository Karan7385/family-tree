// MemberModal.jsx
// Full Add / Edit modal with all relation fields: father, mother, spouses, children
// npm install react-dropzone react-toastify axios react-select

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-toastify";
import axios from "axios";
import Select from "react-select";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ─── react-select dark theme styles ─── */
const selectStyles = {
  control: (b, s) => ({
    ...b,
    background: "#1e293b",
    border: `1px solid ${s.isFocused ? "#6366f1" : "#334155"}`,
    borderRadius: 12,
    boxShadow: "none",
    minHeight: 42,
    "&:hover": { borderColor: "#6366f1" },
  }),
  menu: (b) => ({ ...b, background: "#0f172a", border: "1px solid #334155", borderRadius: 12, zIndex: 9999 }),
  option: (b, s) => ({
    ...b,
    background: s.isFocused ? "#1e293b" : "transparent",
    color: s.isSelected ? "#818cf8" : "#cbd5e1",
    fontSize: 13,
    "&:active": { background: "#334155" },
  }),
  multiValue: (b) => ({ ...b, background: "#312e81", borderRadius: 6 }),
  multiValueLabel: (b) => ({ ...b, color: "#a5b4fc", fontSize: 12 }),
  multiValueRemove: (b) => ({ ...b, color: "#a5b4fc", "&:hover": { background: "#4f46e5", color: "#fff" } }),
  singleValue: (b) => ({ ...b, color: "#e2e8f0" }),
  placeholder: (b) => ({ ...b, color: "#475569", fontSize: 13 }),
  input: (b) => ({ ...b, color: "#e2e8f0" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (b) => ({ ...b, color: "#475569" }),
  clearIndicator: (b) => ({ ...b, color: "#475569" }),
};

/* ─── Reusable field label ─── */
const Label = ({ children, required, danger }) => (
  <label
    className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-0.5 ${
      danger ? "text-red-400" : "text-slate-500"
    }`}
  >
    {children}
    {required && <span className="text-indigo-400 ml-0.5">*</span>}
  </label>
);

/* ─── Reusable input ─── */
const Input = ({ danger, ...props }) => (
  <input
    {...props}
    className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors ${
      danger
        ? "border-red-500/30 focus:border-red-500"
        : "border-slate-700 focus:border-indigo-500"
    }`}
  />
);

/* ─── Reusable select (native) ─── */
const NativeSelect = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-colors appearance-none"
  >
    {children}
  </select>
);

/* ─── Spouse row with status selector ─── */
const SpouseRow = ({ spouse, onRemove, onStatusChange }) => (
  <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2">
    <div className="flex-1 text-sm text-slate-200 font-medium truncate">
      {spouse.label}
    </div>
    <select
      value={spouse.status}
      onChange={(e) => onStatusChange(spouse.value, e.target.value)}
      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
    >
      <option value="married">Married</option>
      <option value="divorced">Divorced</option>
      <option value="widowed">Widowed</option>
      <option value="partner">Partner</option>
    </select>
    <button
      type="button"
      onClick={() => onRemove(spouse.value)}
      className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none"
    >
      ×
    </button>
  </div>
);

/* ═══════════════════════════════════════
   MEMBER MODAL
═══════════════════════════════════════ */
export default function MemberModal({
  isOpen,
  onClose,
  loggedInUser,
  initialData = null,
  allMembers = [],
  onSuccess,
}) {
  const isEdit = !!initialData;

  const emptyForm = {
    firstName: "",
    lastName: "",
    gender: "male",
    dob: "",
    dod: "",
    isAlive: "true",
    deathCause: "",
    placeOfBirth: "",
    bio: "",
    photo: null,
    father: null,       // { value, label }
    mother: null,       // { value, label }
    spouses: [],        // [{ value, label, status }]
    children: [],       // [{ value, label }]
  };

  const [formData, setFormData] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic"); // basic | relations

  /* ─── Populate form on edit ─── */
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const toOpt = (m) =>
        m ? { value: m._id || m, label: `${m.firstName || ""} ${m.lastName || ""}`.trim() } : null;

      setFormData({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        gender: initialData.gender || "male",
        dob: initialData.dob ? initialData.dob.slice(0, 10) : "",
        dod: initialData.dod ? initialData.dod.slice(0, 10) : "",
        isAlive: initialData.isAlive === false ? "false" : "true",
        deathCause: initialData.deathCause || "",
        placeOfBirth: initialData.placeOfBirth || "",
        bio: initialData.bio || "",
        photo: null,
        father: toOpt(initialData.father),
        mother: toOpt(initialData.mother),
        spouses: (initialData.spouses || []).map((s) => ({
          value: s.spouse?._id || s.spouse,
          label: s.spouse?.firstName
            ? `${s.spouse.firstName} ${s.spouse.lastName}`.trim()
            : s.spouse,
          status: s.status || "married",
        })),
        children: (initialData.children || []).map((c) =>
          toOpt(typeof c === "object" ? c : { _id: c, firstName: c })
        ),
      });
      setPreview(initialData.photoURL ? `${initialData.photoURL}` : null);
    } else {
      setFormData(emptyForm);
      setPreview(null);
    }
    setActiveTab("basic");
  }, [isOpen, initialData]);

  /* ─── Photo drop ─── */
  const onDrop = useCallback((accepted) => {
    const file = accepted[0];
    if (!file) return;
    setFormData((p) => ({ ...p, photo: file }));
    setPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  /* ─── Member options for react-select (exclude self) ─── */
  const memberOptions = allMembers
    .filter((m) => m._id !== initialData?._id)
    .map((m) => ({
      value: m._id,
      label: `${m.firstName} ${m.lastName}`,
      gender: m.gender,
    }));

  const fatherOptions = memberOptions.filter((m) => m.gender === "male");
  const motherOptions = memberOptions.filter((m) => m.gender === "female");

  /* ─── Field change ─── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  /* ─── Spouse helpers ─── */
  const handleAddSpouse = (opt) => {
    if (!opt) return;
    if (formData.spouses.some((s) => s.value === opt.value)) return;
    setFormData((p) => ({
      ...p,
      spouses: [...p.spouses, { ...opt, status: "married" }],
    }));
  };

  const handleRemoveSpouse = (id) =>
    setFormData((p) => ({ ...p, spouses: p.spouses.filter((s) => s.value !== id) }));

  const handleSpouseStatusChange = (id, status) =>
    setFormData((p) => ({
      ...p,
      spouses: p.spouses.map((s) => (s.value === id ? { ...s, status } : s)),
    }));

  /* ─── Submit ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!loggedInUser?.id) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    setLoading(true);
    const data = new FormData();

    data.append("firstName", formData.firstName);
    data.append("lastName", formData.lastName);
    data.append("gender", formData.gender);
    data.append("isAlive", formData.isAlive === "true");
    if (formData.dob) data.append("dob", formData.dob);
    if (formData.placeOfBirth) data.append("placeOfBirth", formData.placeOfBirth);
    if (formData.bio) data.append("bio", formData.bio);
    data.append("createdBy", loggedInUser.id);

    if (formData.isAlive === "false") {
      if (formData.dod) data.append("dod", formData.dod);
      if (formData.deathCause) data.append("deathCause", formData.deathCause);
    }

    if (formData.father?.value) data.append("father", formData.father.value);
    if (formData.mother?.value) data.append("mother", formData.mother.value);

    // Spouses as JSON
    if (formData.spouses.length > 0) {
      data.append(
        "spouses",
        JSON.stringify(
          formData.spouses.map((s) => ({ spouse: s.value, status: s.status }))
        )
      );
    }

    // Children as JSON array of IDs
    if (formData.children.length > 0) {
      data.append(
        "children",
        JSON.stringify(formData.children.map((c) => c.value))
      );
    }

    if (formData.photo) data.append("photo", formData.photo);

    try {
      const url = isEdit
        ? `${BASE_URL}/api/tree/members/${initialData._id}`
        : `${BASE_URL}/api/tree/members`;

      const method = isEdit ? "put" : "post";

      const res = await axios[method](url, data, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!res.data.success) {
        toast.error(res.data.message);
        return;
      }

      toast.success(isEdit ? "Member updated!" : "Member added to tree!");
      onSuccess?.();
      window.location.reload();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Request failed";
      const errs = err.response?.data?.errors;
      if (errs) toast.error(`Validation: ${errs.join(", ")}`);
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const TABS = [
    { id: "basic",     label: "Personal",   icon: "👤" },
    { id: "relations", label: "Relations",  icon: "🔗" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex justify-center items-start p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-2xl rounded-3xl shadow-2xl my-6 overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #0d1528 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
          boxShadow: "0 0 60px rgba(99,102,241,0.15), 0 40px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Gradient top bar */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg,#6366f1,#06b6d4,#f472b6)" }}
        />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2
                className="text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: "'Space Mono',monospace" }}
              >
                {isEdit ? "Edit Member" : "Add Member"}
              </h2>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
                by{" "}
                <span className="text-indigo-400">{loggedInUser?.name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all text-xl"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-7 p-1 bg-slate-900 rounded-2xl">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                style={
                  activeTab === tab.id
                    ? { background: "linear-gradient(135deg,#6366f1,#4f46e5)" }
                    : {}
                }
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* ══════ TAB: PERSONAL ══════ */}
            {activeTab === "basic" && (
              <div className="space-y-5">
                {/* Photo */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <input {...getInputProps()} />
                  {preview ? (
                    <div className="flex items-center gap-4 justify-center">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-lg shadow-indigo-500/20"
                      />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">Photo set</p>
                        <p className="text-xs text-slate-500">Click or drag to replace</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2">
                      <p className="text-3xl mb-1">📸</p>
                      <p className="text-sm font-medium text-slate-400">
                        Drop photo here or click to upload
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </div>

                {/* Name Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>First Name</Label>
                    <Input name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="John" />
                  </div>
                  <div>
                    <Label required>Last Name</Label>
                    <Input name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Doe" />
                  </div>
                </div>

                {/* Gender + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Gender</Label>
                    <NativeSelect name="gender" value={formData.gender} onChange={handleChange}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="others">Others</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <NativeSelect name="isAlive" value={formData.isAlive} onChange={handleChange}>
                      <option value="true">Living</option>
                      <option value="false">Deceased</option>
                    </NativeSelect>
                  </div>
                </div>

                {/* DOB + DOD */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" name="dob" value={formData.dob} onChange={handleChange} />
                  </div>
                  {formData.isAlive === "false" && (
                    <div>
                      <Label danger>Date of Death</Label>
                      <Input danger type="date" name="dod" value={formData.dod} onChange={handleChange} />
                    </div>
                  )}
                </div>

                {/* Death Cause (conditional) */}
                {formData.isAlive === "false" && (
                  <div>
                    <Label danger>Cause of Death</Label>
                    <Input
                      danger
                      name="deathCause"
                      value={formData.deathCause}
                      onChange={handleChange}
                      placeholder="e.g. Natural causes"
                    />
                  </div>
                )}

                {/* Place of Birth */}
                <div>
                  <Label>Place of Birth</Label>
                  <Input
                    name="placeOfBirth"
                    value={formData.placeOfBirth}
                    onChange={handleChange}
                    placeholder="City, Country"
                  />
                </div>

                {/* Bio */}
                <div>
                  <Label>Short Bio</Label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    maxLength={500}
                    placeholder="A few words about this person..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                  <p className="text-right text-[10px] text-slate-600 mt-1">
                    {formData.bio?.length || 0}/500
                  </p>
                </div>
              </div>
            )}

            {/* ══════ TAB: RELATIONS ══════ */}
            {activeTab === "relations" && (
              <div className="space-y-6">
                {/* Father */}
                <div>
                  <Label>Father</Label>
                  <Select
                    styles={selectStyles}
                    options={fatherOptions}
                    value={formData.father}
                    onChange={(v) => setFormData((p) => ({ ...p, father: v }))}
                    isClearable
                    placeholder="Select father..."
                  />
                </div>

                {/* Mother */}
                <div>
                  <Label>Mother</Label>
                  <Select
                    styles={selectStyles}
                    options={motherOptions}
                    value={formData.mother}
                    onChange={(v) => setFormData((p) => ({ ...p, mother: v }))}
                    isClearable
                    placeholder="Select mother..."
                  />
                </div>

                {/* Spouses */}
                <div>
                  <Label>Spouses / Partners</Label>
                  <Select
                    styles={selectStyles}
                    options={memberOptions.filter(
                      (o) => !formData.spouses.some((s) => s.value === o.value)
                    )}
                    value={null}
                    onChange={handleAddSpouse}
                    placeholder="Add spouse or partner..."
                    isClearable={false}
                  />
                  {formData.spouses.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.spouses.map((sp) => (
                        <SpouseRow
                          key={sp.value}
                          spouse={sp}
                          onRemove={handleRemoveSpouse}
                          onStatusChange={handleSpouseStatusChange}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Children */}
                <div>
                  <Label>Children</Label>
                  <Select
                    styles={selectStyles}
                    options={memberOptions.filter(
                      (o) => !formData.children.some((c) => c.value === o.value)
                    )}
                    isMulti
                    value={formData.children}
                    onChange={(v) => setFormData((p) => ({ ...p, children: v || [] }))}
                    placeholder="Select children..."
                  />
                </div>

                {/* Relation summary */}
                {(formData.father || formData.mother || formData.spouses.length > 0 || formData.children.length > 0) && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                      Relation Summary
                    </p>
                    <div className="space-y-1.5 text-sm">
                      {formData.father && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-indigo-400 w-16 text-xs font-bold">Father</span>
                          {formData.father.label}
                        </div>
                      )}
                      {formData.mother && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-pink-400 w-16 text-xs font-bold">Mother</span>
                          {formData.mother.label}
                        </div>
                      )}
                      {formData.spouses.map((s) => (
                        <div key={s.value} className="flex items-center gap-2 text-slate-300">
                          <span className="text-yellow-400 w-16 text-xs font-bold capitalize">{s.status}</span>
                          {s.label}
                        </div>
                      ))}
                      {formData.children.map((c) => (
                        <div key={c.value} className="flex items-center gap-2 text-slate-300">
                          <span className="text-green-400 w-16 text-xs font-bold">Child</span>
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-slate-700 hover:border-slate-500 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#6366f1,#06b6d4)",
                  boxShadow: "0 8px 24px -8px rgba(99,102,241,0.6)",
                }}
              >
                {loading
                  ? isEdit ? "Saving..." : "Creating..."
                  : isEdit ? "Save Changes" : "Add to Family Tree"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
