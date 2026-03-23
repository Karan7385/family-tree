import React, { useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  Panel,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import MemberModal from "../components/MemberModal";
import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ═══════════════════════════════════════
   DAGRE LAYOUT HELPER
═══════════════════════════════════════ */
const NODE_W = 200;
const NODE_H = 80;

function getLayoutedElements(nodes, edges, direction = "TB") {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100, edgesep: 20 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      return {
        ...n,
        position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      };
    }),
    edges,
  };
}

const FamilyNode = ({ data, selected }) => {
  const isDeceased = !data.isAlive;
  const genderColor =
    data.gender === "male"
      ? "#6366f1"
      : data.gender === "female"
        ? "#ec4899"
        : "#06b6d4";

  return (
    <div
      style={{
        background: selected
          ? "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(6,182,212,0.15))"
          : "rgba(15,23,42,0.95)",
        border: `2px solid ${selected ? genderColor : "rgba(99,102,241,0.25)"}`,
        borderRadius: 16,
        padding: "10px 14px",
        minWidth: NODE_W,
        boxShadow: selected
          ? `0 0 20px ${genderColor}55, 0 8px 32px rgba(0,0,0,0.6)`
          : "0 4px 24px rgba(0,0,0,0.5)",
        opacity: isDeceased ? 0.75 : 1,
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: genderColor,
          width: 8,
          height: 8,
          border: "2px solid #0f172a",
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: genderColor,
          width: 8,
          height: 8,
          border: "2px solid #0f172a",
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="spouse-in"
        style={{
          background: "#fbbf24",
          width: 7,
          height: 7,
          border: "2px solid #0f172a",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="spouse-out"
        style={{
          background: "#fbbf24",
          width: 7,
          height: 7,
          border: "2px solid #0f172a",
        }}
      />

      {/* Deceased badge */}
      {isDeceased && (
        <div
          style={{
            position: "absolute",
            top: -10,
            right: -4,
            background: "#1e293b",
            border: "1px solid #475569",
            borderRadius: 99,
            fontSize: 9,
            padding: "1px 7px",
            color: "#94a3b8",
            letterSpacing: "0.08em",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          🕊 Deceased
        </div>
      )}

      {/* Gender stripe */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 8,
          bottom: 8,
          width: 3,
          background: genderColor,
          borderRadius: "0 2px 2px 0",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingLeft: 6,
        }}
      >
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <img
            src={
              data.photoURL && data.photoURL !== "default.jpg"
                ? `${BASE_URL}/${data.photoURL}`
                : `https://ui-avatars.com/api/?name=${data.firstName}+${data.lastName}&background=1e293b&color=${genderColor.slice(1)}&bold=true&size=64`
            }
            alt=""
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `2px solid ${genderColor}`,
              objectFit: "cover",
            }}
          />
          {isDeceased && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.4)",
              }}
            />
          )}
        </div>

        {/* Info */}
        <div style={{ overflow: "hidden" }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#f1f5f9",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 120,
              fontFamily: "'Sora',sans-serif",
            }}
          >
            {data.firstName} {data.lastName}
          </p>
          {data.dob && (
            <p style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
              b. {new Date(data.dob).getFullYear()}
              {!data.isAlive && data.dod
                ? ` – d. ${new Date(data.dod).getFullYear()}`
                : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const MemberDetailDrawer = ({
  member,
  allMembers,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!member) return null;

  const resolve = (id) => allMembers.find((m) => m._id === (id?._id || id));
  const father = resolve(member.father);
  const mother = resolve(member.mother);

  const infoRow = (label, value) =>
    value ? (
      <div className="flex justify-between items-start py-2 border-b border-slate-800">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest w-28 flex-shrink-0">
          {label}
        </span>
        <span className="text-sm text-slate-300 text-right">{value}</span>
      </div>
    ) : null;

  const genderColor =
    member.gender === "male"
      ? "#6366f1"
      : member.gender === "female"
        ? "#ec4899"
        : "#06b6d4";

  return (
    <div
      className="fixed inset-y-0 right-0 z-[150] flex flex-col"
      style={{
        width: 340,
        background: "rgba(7,13,32,0.97)",
        backdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(99,102,241,0.2)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
      }}
    >
      {/* Top gradient bar */}
      <div
        className="h-1 w-full flex-shrink-0"
        style={{
          background: `linear-gradient(90deg, ${genderColor}, transparent)`,
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all text-lg"
          >
            ✕
          </button>

          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center mt-2">
            <div className="relative">
              <img
                src={
                  member.photoURL && member.photoURL !== "default.jpg"
                    ? `${BASE_URL}/${member.photoURL}`
                    : `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=1e293b&color=${genderColor.slice(1)}&bold=true&size=128`
                }
                alt=""
                className="w-24 h-24 rounded-full object-cover"
                style={{
                  border: `3px solid ${genderColor}`,
                  boxShadow: `0 0 24px ${genderColor}44`,
                }}
              />
              {!member.isAlive && (
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                >
                  <span style={{ fontSize: 22 }}>🕊</span>
                </div>
              )}
            </div>
            <h2
              className="text-xl font-bold text-white mt-4"
              style={{ fontFamily: "'Space Mono',monospace" }}
            >
              {member.firstName} {member.lastName}
            </h2>
            <span
              className="text-xs uppercase tracking-widest font-bold mt-1 px-3 py-1 rounded-full"
              style={{
                background: `${genderColor}22`,
                color: genderColor,
                border: `1px solid ${genderColor}44`,
              }}
            >
              {member.gender}
              {!member.isAlive && " · Deceased"}
            </span>
          </div>
        </div>

        {/* Bio */}
        {member.bio && (
          <div className="px-6 mb-4">
            <div
              className="p-4 rounded-2xl text-sm text-slate-400 italic leading-relaxed"
              style={{
                background: "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.1)",
              }}
            >
              "{member.bio}"
            </div>
          </div>
        )}

        {/* Info */}
        <div className="px-6">
          {infoRow(
            "Born",
            member.dob
              ? new Date(member.dob).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : null,
          )}
          {infoRow("Birthplace", member.placeOfBirth)}
          {!member.isAlive &&
            infoRow(
              "Died",
              member.dod
                ? new Date(member.dod).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : null,
            )}
          {!member.isAlive && infoRow("Cause", member.deathCause)}
        </div>

        {/* Family Relations */}
        <div className="px-6 mt-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Family
          </p>
          <div className="space-y-2">
            {father && (
              <RelationChip label="Father" member={father} color="#6366f1" />
            )}
            {mother && (
              <RelationChip label="Mother" member={mother} color="#ec4899" />
            )}
            {(member.spouses || []).map((s, i) => {
              const sp = resolve(s.spouse);
              return sp ? (
                <RelationChip
                  key={i}
                  label={s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  member={sp}
                  color="#fbbf24"
                />
              ) : null;
            })}
            {(member.children || []).map((c, i) => {
              const ch = resolve(c);
              return ch ? (
                <RelationChip
                  key={i}
                  label="Child"
                  member={ch}
                  color="#22c55e"
                />
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* Edit Button */}
      <div className="p-5 border-t border-slate-800">
        <button
          onClick={onEdit}
          className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            boxShadow: "0 8px 24px -8px rgba(99,102,241,0.5)",
          }}
        >
          ✏️ Edit Member & Relations
        </button>
        <button
          onClick={() => onDelete(member._id)}
          className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] mt-3 group"
          style={{
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            boxShadow: "0 8px 24px -8px rgba(239, 68, 68, 0.5)",
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <span className="group-hover:animate-bounce">🗑️</span>
            Delete Member
          </span>
        </button>
      </div>
    </div>
  );
};

const RelationChip = ({ label, member, color }) => (
  <div
    className="flex items-center gap-3 rounded-xl p-2.5"
    style={{ background: `${color}10`, border: `1px solid ${color}25` }}
  >
    <span
      className="text-[10px] font-bold uppercase tracking-wider w-16 flex-shrink-0"
      style={{ color }}
    >
      {label}
    </span>
    <span className="text-sm text-slate-300">
      {member.firstName} {member.lastName}
    </span>
  </div>
);

const EdgeLegend = () => (
  <div
    className="flex flex-wrap gap-4 text-xs"
    style={{
      background: "rgba(7,13,32,0.9)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(99,102,241,0.15)",
      borderRadius: 12,
      padding: "10px 16px",
    }}
  >
    {[
      { color: "#6366f1", label: "Father" },
      { color: "#ec4899", label: "Mother" },
      { color: "#fbbf24", label: "Spouse" },
      { color: "#22c55e", label: "Child" },
    ].map(({ color, label }) => (
      <div key={label} className="flex items-center gap-1.5">
        <div
          style={{ width: 20, height: 2, background: color, borderRadius: 1 }}
        />
        <span style={{ color: "#94a3b8" }}>{label}</span>
      </div>
    ))}
  </div>
);

const nodeTypes = { familyNode: FamilyNode };

export default function FamilyTree({
  members = [],
  loading,
  user,
  onDataChange,
}) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [layoutDir, setLayoutDir] = useState("TB"); // TB | LR

  /* ─── Build nodes + edges from member data ─── */
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (!members?.length) return { nodes: [], edges: [] };

    const searchLower = search.toLowerCase();
    const filtered = search
      ? members.filter((m) =>
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchLower),
        )
      : members;
    const filteredIds = new Set(filtered.map((m) => m._id));

    const rawNodes = filtered.map((m) => ({
      id: m._id,
      type: "familyNode",
      data: { ...m },
      position: { x: 0, y: 0 },
    }));

    const rawEdges = [];

    members.forEach((m) => {
      if (!filteredIds.has(m._id)) return;

      // Father edge
      if (m.father && filteredIds.has(m.father?._id || m.father)) {
        rawEdges.push({
          id: `f-${m.father}-${m._id}`,
          source: m.father?._id || m.father,
          target: m._id,
          label: "father",
          style: { stroke: "#6366f1", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          labelStyle: { fill: "#6366f1", fontSize: 9, fontWeight: 700 },
          labelBgStyle: { fill: "#0f172a", fillOpacity: 0.9 },
          animated: false,
          type: "smoothstep",
        });
      }

      // Mother edge
      if (m.mother && filteredIds.has(m.mother?._id || m.mother)) {
        rawEdges.push({
          id: `m-${m.mother}-${m._id}`,
          source: m.mother?._id || m.mother,
          target: m._id,
          label: "mother",
          style: { stroke: "#ec4899", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#ec4899" },
          labelStyle: { fill: "#ec4899", fontSize: 9, fontWeight: 700 },
          labelBgStyle: { fill: "#0f172a", fillOpacity: 0.9 },
          animated: false,
          type: "smoothstep",
        });
      }

      // Spouse edges (undirected – avoid duplicates)
      (m.spouses || []).forEach((s) => {
        const spId = s.spouse?._id || s.spouse;
        if (!spId || !filteredIds.has(spId)) return;
        const edgeId1 = `sp-${m._id}-${spId}`;
        const edgeId2 = `sp-${spId}-${m._id}`;
        if (rawEdges.some((e) => e.id === edgeId1 || e.id === edgeId2)) return;
        rawEdges.push({
          id: edgeId1,
          source: m._id,
          target: spId,
          sourceHandle: "spouse-out",
          targetHandle: "spouse-in",
          label: s.status || "spouse",
          style: { stroke: "#fbbf24", strokeWidth: 2, strokeDasharray: "5 3" },
          labelStyle: { fill: "#fbbf24", fontSize: 9, fontWeight: 700 },
          labelBgStyle: { fill: "#0f172a", fillOpacity: 0.9 },
          animated: false,
          type: "straight",
        });
      });
    });

    return getLayoutedElements(rawNodes, rawEdges, layoutDir);
  }, [members, search, layoutDir]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Sync layout changes
  React.useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedMember(node.data);
  }, []);

  const handleAddNew = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  const onDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this member? This will remove all their relations.",
      )
    ) {
      return;
    }

    try {
      const res = await axios.delete(`${BASE_URL}/api/tree/members/${id}`, {
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success("Deleted Successfully.");
        setSelectedMember(null);
        onDataChange?.();
        window.location.reload();
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to delete.";
      toast.error(msg);
    }
  };

  const handleEdit = () => {
    setEditData(selectedMember);
    setIsModalOpen(true);
    setSelectedMember(null);
  };

  const handleModalSuccess = () => {
    onDataChange?.();
    setIsModalOpen(false);
    setEditData(null);
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white gap-4">
        <div
          className="w-12 h-12 rounded-full border-t-2 border-r-2 animate-spin"
          style={{ borderColor: "#6366f1 transparent" }}
        />
        <p
          className="text-sm uppercase tracking-widest text-slate-500 animate-pulse"
          style={{ fontFamily: "'Space Mono',monospace" }}
        >
          Fetching Lineage…
        </p>
      </div>
    );
  }

  /* ─── Empty state ─── */
  if (!members?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-center px-6">
        <div className="text-8xl mb-6 animate-bounce">🌳</div>
        <h2
          className="text-3xl font-bold text-white mb-3"
          style={{ fontFamily: "'Space Mono',monospace" }}
        >
          The Roots are Silent
        </h2>
        <p className="text-slate-500 max-w-sm leading-relaxed">
          Start your family archive by adding the first member.
        </p>
        <button
          className="mt-8 px-8 py-3 rounded-2xl font-bold text-white hover:scale-105 active:scale-95 transition-transform"
          onClick={handleAddNew}
          style={{
            background: "linear-gradient(135deg,#6366f1,#06b6d4)",
            boxShadow: "0 0 30px rgba(99,102,241,0.3)",
          }}
        >
          + Add First Member
        </button>
        <MemberModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          loggedInUser={user}
          allMembers={[]}
          onSuccess={handleModalSuccess}
        />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        style={{ background: "#020617" }}
      >
        <Background color="#1e293b" gap={28} size={1} />
        <Controls
          style={{
            background: "rgba(7,13,32,0.9)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        />
        <MiniMap
          style={{
            background: "#0f172a",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 12,
          }}
          nodeColor={(n) =>
            n.data?.gender === "male"
              ? "#6366f1"
              : n.data?.gender === "female"
                ? "#ec4899"
                : "#06b6d4"
          }
          maskColor="rgba(2,6,23,0.7)"
        />

        {/* Top toolbar */}
        <Panel position="top-center">
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
            style={{
              background: "rgba(7,13,32,0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(99,102,241,0.2)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                width={13}
                height={13}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx={11} cy={11} r={8} />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members…"
                className="bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors w-48"
              />
            </div>

            {/* Layout toggle */}
            <div className="flex gap-1">
              {["TB", "LR"].map((dir) => (
                <button
                  key={dir}
                  onClick={() => setLayoutDir(dir)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    layoutDir === dir
                      ? "text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  style={
                    layoutDir === dir
                      ? {
                          background: "rgba(99,102,241,0.3)",
                          border: "1px solid rgba(99,102,241,0.5)",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid transparent",
                        }
                  }
                  title={
                    dir === "TB" ? "Top-Bottom layout" : "Left-Right layout"
                  }
                >
                  {dir === "TB" ? "↕ Vertical" : "↔ Horizontal"}
                </button>
              ))}
            </div>

            {/* Member count */}
            <div
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{
                background: "rgba(99,102,241,0.15)",
                color: "#818cf8",
                border: "1px solid rgba(99,102,241,0.25)",
              }}
            >
              {members.length} member{members.length !== 1 ? "s" : ""}
            </div>
          </div>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-left">
          <EdgeLegend />
        </Panel>
      </ReactFlow>

      {/* Detail Drawer */}
      {selectedMember && (
        <MemberDetailDrawer
          member={selectedMember}
          allMembers={members}
          onClose={() => setSelectedMember(null)}
          onEdit={handleEdit}
          onDelete={onDelete}
        />
      )}

      {/* FAB */}
      <button
        onClick={handleAddNew}
        className="fixed bottom-8 right-8 z-[100] flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg,#6366f1,#06b6d4)",
          boxShadow:
            "0 0 30px rgba(99,102,241,0.4), 0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <span className="text-lg leading-none">+</span>
        Add Member
      </button>

      {/* Modal */}
      <MemberModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(null);
        }}
        loggedInUser={user}
        initialData={editData}
        allMembers={members}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
