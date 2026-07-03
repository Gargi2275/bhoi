import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronRight, ChevronDown, Users, Briefcase, Heart, 
  Calendar, Building2, MapPin, Globe, Search, Plus, Minus, Compass, Shield, CheckCircle, PlusCircle, Layout, ArrowRight, MoreVertical
} from "lucide-react";
import { StatusBadge, StatCard, Modal } from "@/components/wag/primitives";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  MiniMap,
  Background,
  Panel,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  Node,
  Edge
} from '@xyflow/react';
import dagre from 'dagre';

import '@xyflow/react/dist/style.css';

export interface HierarchyNode {
  id: number;
  name: string;
  type: string;
  status: string;
  state: string;
  district: string;
  logo_url: string | null;
  admin_name: string;
  stats: {
    total_members: number;
    male_members: number;
    female_members: number;
    active_events: number;
    matrimony_profiles: number;
    jobs_posted: number;
    donations_sum: number;
    total_subsidiaries: number;
  };
  desc?: string;
  children: HierarchyNode[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper to get all flat nodes
function getFlatNodes(nodes: HierarchyNode[]): HierarchyNode[] {
  let flat: HierarchyNode[] = [];
  function traverse(n: HierarchyNode) {
    flat.push(n);
    if (n.children) n.children.forEach(traverse);
  }
  nodes.forEach(traverse);
  return flat;
}

// Find parent node
function findParentNode(nodes: HierarchyNode[], targetId: number, parent: HierarchyNode | null = null): HierarchyNode | null {
  for (const n of nodes) {
    if (n.id === targetId) return parent;
    if (n.children) {
      const found = findParentNode(n.children, targetId, n);
      if (found) return found;
    }
  }
  return null;
}

// Get path breadcrumbs
function getBreadcrumbs(nodes: HierarchyNode[], targetId: number, path: HierarchyNode[] = []): HierarchyNode[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return [...path, n];
    if (n.children) {
      const found = getBreadcrumbs(n.children, targetId, [...path, n]);
      if (found) return found;
    }
  }
  return null;
}

// Custom React Flow Node Component
const CommunityNodeComponent = ({ data }: { data: any }) => {
  const node = data.node;
  const isSelected = data.isSelected;
  const isMatch = data.isMatch;
  const onSelect = data.onSelect;

  return (
    <div className="relative">
      {/* Target handle - top position for vertical organization layout */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: 'var(--primary)', width: 8, height: 8 }}
      />

      <div
        onClick={() => onSelect(node)}
        className={`w-[280px] h-[140px] p-3.5 bg-surface border rounded-[20px] shadow-sm hover:shadow-xl cursor-pointer transition-all duration-300 relative flex flex-col justify-between overflow-hidden ${
          isSelected 
            ? "ring-4 ring-primary/40 border-primary shadow-2xl shadow-primary/20" 
            : isMatch 
            ? "ring-2 ring-gold border-gold/75 bg-gold/5" 
            : "border-warm/80 hover:border-warm-muted"
        }`}
      >
        {/* Top gradient header strip */}
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
          node.type.includes('Super') 
            ? 'from-orange-500 via-amber-400 to-yellow-500' 
            : node.type.includes('Parent')
            ? 'from-primary via-gold to-accent'
            : 'from-blue-500 via-teal-400 to-indigo-500'
        }`} />

        {/* Top row */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white overflow-hidden shadow-xs shrink-0">
              {node.logo_url ? (
                <img src={node.logo_url} alt={node.name} className="w-full h-full object-cover" />
              ) : (
                <Globe className="w-5 h-5 text-white" />
              )}
            </div>
            
            <div className="min-w-0 flex flex-col">
              <h4 className="font-bold text-foreground font-ui text-xs truncate leading-normal">
                {node.name}
              </h4>
              <span className={`text-[8px] font-bold uppercase tracking-wider block mt-0.5 ${
                node.type.includes('Super') 
                  ? 'text-orange-600' 
                  : node.type.includes('Parent')
                  ? 'text-primary' 
                  : 'text-indigo-600'
              }`}>
                {node.type.replace(' Community', '')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <StatusBadge status={node.status} />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                alert(`Action menu for ${node.name}`);
              }}
              className="p-1 rounded-md hover:bg-sand text-warm-muted hover:text-foreground transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-warm/60 mt-1">
          <div className="flex items-center gap-1.5 text-xs text-warm-muted">
            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] font-semibold text-warm-muted leading-none">COMMUNITIES</span>
              <span className="font-bold text-foreground text-[10px] mt-0.5">{node.stats.total_subsidiaries}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-warm-muted">
            <Users className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] font-semibold text-warm-muted leading-none">MEMBERS</span>
              <span className="font-bold text-foreground text-[10px] mt-0.5">{node.stats.total_members.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Source handle - bottom position for vertical layout */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: 'var(--primary)', width: 8, height: 8 }}
      />
    </div>
  );
};

const nodeTypes = {
  community: CommunityNodeComponent
};

// Internal React Flow Canvas wrapper (Vertical Tree View)
const InnerFlowCanvas = ({ 
  nodes, 
  edges, 
  onSelectNode, 
  selectedNode, 
  expandAll,
  collapseAll
}: {
  nodes: Node[];
  edges: Edge[];
  onSelectNode: (node: HierarchyNode) => void;
  selectedNode: HierarchyNode | null;
  expandAll: () => void;
  collapseAll: () => void;
}) => {
  const { fitView } = useReactFlow();

  // fitView on load & nodes list change with 20% padding
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 600 });
      }, 150);
    }
  }, [nodes, fitView]);

  // center on selected node change
  useEffect(() => {
    if (selectedNode) {
      setTimeout(() => {
        fitView({ 
          nodes: [{ id: String(selectedNode.id) }], 
          duration: 600, 
          minZoom: 0.8, 
          maxZoom: 1.0 
        });
      }, 100);
    }
  }, [selectedNode, fitView]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.15}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        className="bg-[#FAF8F5] dark:bg-[#121110]"
      >
        <Background color="#ccc" gap={24} size={1.2} />
        
        <MiniMap 
          nodeColor={(n: any) => {
            const type = n.data?.node?.type || '';
            if (type.includes('Super')) return '#f97316';
            if (type.includes('Parent')) return '#ea580c';
            return '#3b82f6';
          }}
          className="!bg-surface !border !border-warm !rounded-2xl shadow-md shrink-0"
        />
        
        {/* Custom Controls panel overlay with Expand/Collapse and Zoom */}
        <Panel position="top-right" className="flex items-center gap-2 bg-surface/95 backdrop-blur border border-warm p-1.5 rounded-xl shadow-md z-30">
          <div className="flex items-center gap-1 bg-sand p-0.5 rounded-lg border border-warm">
            <button 
              onClick={expandAll}
              className="px-2.5 py-1 text-[9px] font-bold text-warm-muted hover:text-foreground"
            >
              Expand All
            </button>
            <button 
              onClick={collapseAll}
              className="px-2.5 py-1 text-[9px] font-bold text-warm-muted hover:text-foreground"
            >
              Collapse All
            </button>
          </div>

          <div className="h-4 w-px bg-warm" />

          {/* Zoom buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const el = document.querySelector('.react-flow__controls-zoomout') as HTMLButtonElement;
                if (el) el.click();
              }}
              className="p-1.5 rounded-md bg-sand hover:bg-sand/80 border border-warm text-foreground"
              title="Zoom Out"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const el = document.querySelector('.react-flow__controls-zoomin') as HTMLButtonElement;
                if (el) el.click();
              }}
              className="p-1.5 rounded-md bg-sand hover:bg-sand/80 border border-warm text-foreground"
              title="Zoom In"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() => fitView({ padding: 0.2, duration: 600 })}
              className="p-1.5 rounded-md bg-sand hover:bg-sand/80 border border-warm text-foreground"
              title="Fit to screen"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
            {selectedNode && (
              <button
                onClick={() => fitView({ nodes: [{ id: String(selectedNode.id) }], duration: 600, minZoom: 0.8, maxZoom: 1.0 })}
                className="p-1.5 rounded-md bg-sand hover:bg-sand/80 border border-warm text-primary font-bold text-[9px]"
                title="Center Selected Node"
              >
                Center
              </button>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const CommunityHierarchy = () => {
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  
  // View mode switcher: "tree" | "list"
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");

  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"directory" | "canvas">("directory");

  const handleSelectNode = (node: HierarchyNode) => {
    setSelectedNode(node);
    setIsMobileDetailsOpen(true);
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Add Community Form State
  const [newCommName, setNewCommName] = useState("");
  const [newCommState, setNewCommState] = useState("Gujarat");
  const [newCommDistrict, setNewCommDistrict] = useState("Surat");
  const [newCommAdmin, setNewCommAdmin] = useState("");
  const [newCommParentId, setNewCommParentId] = useState<string>("");
  const [newCommDesc, setNewCommDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHierarchy = async () => {
    try {
      const token = localStorage.getItem("wag_token");
      const res = await fetch(`/api/communities/hierarchy/`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHierarchy(data);
        
        // Auto-expand root nodes by default
        const initialExpanded = new Set<number>();
        data.forEach((node: HierarchyNode) => {
          initialExpanded.add(node.id);
          if (node.children) {
            node.children.forEach(child => initialExpanded.add(child.id));
          }
        });
        setExpandedNodes(initialExpanded);

        // Pre-select first root node if nothing selected yet
        if (data.length > 0 && !selectedNode) {
          setSelectedNode(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load hierarchy:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();

    const handleUpdate = () => {
      fetchHierarchy();
    };
    window.addEventListener("community-updated", handleUpdate);
    return () => window.removeEventListener("community-updated", handleUpdate);
  }, []);

  const extractStates = (nodes: HierarchyNode[]): string[] => {
    let states = new Set<string>();
    nodes.forEach(n => {
      if (n.state) states.add(n.state);
      extractStates(n.children).forEach(s => states.add(s));
    });
    return Array.from(states);
  };
  
  const allStates = ["All", ...extractStates(hierarchy)];

  // Recursive statistics calculation
  const stats = React.useMemo(() => {
    let totalComms = 0;
    let superCount = 0;
    let parentCount = 0;
    let subsidiaryCount = 0;
    let childCount = 0;
    let totalMembers = 0;
    let activeCount = 0;
    let totalEvents = 0;
    let totalJobs = 0;
    let totalDonations = 0;

    const traverse = (n: HierarchyNode) => {
      totalComms++;
      const lowerType = (n.type || "").toLowerCase();
      if (lowerType.includes("super")) superCount++;
      else if (lowerType.includes("parent")) parentCount++;
      else if (lowerType.includes("subsidiary")) subsidiaryCount++;
      else childCount++;

      if (n.status === "Active") activeCount++;

      totalMembers += n.stats.total_members || 0;
      totalEvents += n.stats.active_events || 0;
      totalJobs += n.stats.jobs_posted || 0;
      totalDonations += n.stats.donations_sum || 0;

      if (n.children) {
        n.children.forEach(traverse);
      }
    };

    hierarchy.forEach(traverse);
    return {
      totalComms,
      superCount,
      parentCount,
      subsidiaryCount,
      childCount,
      totalMembers,
      activeCount,
      totalEvents,
      totalJobs,
      totalDonations
    };
  }, [hierarchy]);

  // Filtering roots by state
  const filteredHierarchy = hierarchy.filter(h => {
    if (stateFilter !== "All" && h.state !== stateFilter) return false;
    return true;
  });

  const toggleNode = (id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = getFlatNodes(hierarchy).map(n => n.id);
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleCreateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("wag_token");
      const payload = {
        name: newCommName,
        state: newCommState,
        district: newCommDistrict,
        desc: newCommDesc,
        status: "Active",
        parent: newCommParentId ? parseInt(newCommParentId) : null
      };

      const res = await fetch(`/api/communities/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Reset state
        setNewCommName("");
        setNewCommAdmin("");
        setNewCommParentId("");
        setNewCommDesc("");
        setIsAddModalOpen(false);
        // Refresh hierarchy
        fetchHierarchy();
      }
    } catch (err) {
      console.error("Failed to create community:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check branch selection helper
  const isSelectedBranch = (parentId: string, childId: string, selectedNodeId: number, roots: HierarchyNode[]): boolean => {
    const selectedNodeIdStr = String(selectedNodeId);
    if (childId === selectedNodeIdStr) return true;

    const flatNodes = getFlatNodes(roots);
    const childNode = flatNodes.find(n => String(n.id) === childId);
    if (!childNode) return false;

    const checkDescendant = (n: HierarchyNode): boolean => {
      if (String(n.id) === selectedNodeIdStr) return true;
      if (n.children) {
        return n.children.some(checkDescendant);
      }
      return false;
    };

    return checkDescendant(childNode);
  };

  // GENERATE FLOW ELEMENTS FOR REACT FLOW (Strict TB Layout with Sibling Spacing)
  const getFlowElements = () => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const traverse = (node: HierarchyNode, parentId: string | null = null) => {
      const nodeIdStr = String(node.id);
      const isSelected = selectedNode?.id === node.id;
      const isMatch = search && node.name.toLowerCase().includes(search.toLowerCase());

      flowNodes.push({
        id: nodeIdStr,
        type: 'community',
        position: { x: 0, y: 0 },
        data: {
          node,
          isSelected,
          isMatch,
          onSelect: (n: HierarchyNode) => handleSelectNode(n)
        }
      });

      if (parentId) {
        const isActive = selectedNode ? isSelectedBranch(parentId, nodeIdStr, selectedNode.id, hierarchy) : false;
        flowEdges.push({
          id: `e-${parentId}-${nodeIdStr}`,
          source: parentId,
          target: nodeIdStr,
          type: 'smoothstep',
          animated: isActive,
          style: {
            stroke: isActive ? 'var(--primary)' : 'rgba(120, 110, 90, 0.35)',
            strokeWidth: isActive ? 3 : 2,
            opacity: isActive ? 1.0 : 0.65
          }
        });
      }

      if (expandedNodes.has(node.id) && node.children) {
        node.children.forEach(child => traverse(child, nodeIdStr));
      }
    };

    filteredHierarchy.forEach(root => traverse(root));

    // DAGRE AUTO LAYOUT (Level Gap: 150px, Sibling Gap: 80px)
    const direction = 'TB';
    const nodeWidth = 280;
    const nodeHeight = 140;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: direction, ranksep: 150, nodesep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    flowNodes.forEach((node) => {
      g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    flowEdges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes = flowNodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges: flowEdges };
  };

  const { nodes: flowNodes, edges: flowEdges } = getFlowElements();
  const flatComms = getFlatNodes(hierarchy);

  // Filter flat list view nodes based on search & state filters
  const filteredFlatNodes = flatComms.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (stateFilter !== "All" && c.state !== stateFilter) return false;
    return true;
  });

  // Indented List view row renderer for LEFT panel (Community Explorer) with indentation guides
  const renderLeftPanelExplorerNode = (node: HierarchyNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;
    const isMatch = search && node.name.toLowerCase().includes(search.toLowerCase());

    return (
      <React.Fragment key={node.id}>
        <div 
          onClick={() => {
            handleSelectNode(node);
          }}
          className={`flex items-center justify-between py-2 px-3 my-0.5 rounded-xl cursor-pointer transition-all duration-200 border relative ${
            isSelected 
              ? "bg-primary/10 border-primary/20 text-primary font-semibold" 
              : isMatch
              ? "bg-gold/15 border-gold/30"
              : "border-transparent hover:bg-sand/40"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Indentation Guides */}
            <div className="flex items-center shrink-0">
              {[...Array(depth)].map((_, idx) => (
                <div key={idx} className="w-4 h-6 border-r border-warm-muted/30 relative">
                  {idx === depth - 1 && (
                    <div className="absolute top-1/2 left-0 w-2 h-px bg-warm-muted/30" />
                  )}
                </div>
              ))}
            </div>

            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className="w-5 h-5 rounded-md hover:bg-sand flex items-center justify-center text-warm-muted shrink-0"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <div className="w-5 shrink-0" />
            )}
            
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white overflow-hidden shrink-0">
              {node.logo_url ? (
                <img src={node.logo_url} alt={node.name} className="w-full h-full object-cover" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            
            <div className="min-w-0 flex flex-col">
              <span className="font-bold text-foreground font-ui text-xs truncate leading-normal">{node.name}</span>
              <span className="text-[9px] text-warm-muted mt-0.5 font-medium">
                {node.stats.total_members} members • {node.stats.total_subsidiaries} childs
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
            <StatusBadge status={node.status} />
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="w-full">
            {node.children.map(child => renderLeftPanelExplorerNode(child, depth + 1))}
          </div>
        )}
      </React.Fragment>
    );
  };

  const selectedNodeParent = selectedNode ? findParentNode(hierarchy, selectedNode.id) : null;
  const breadcrumbs = selectedNode ? getBreadcrumbs(hierarchy, selectedNode.id) : null;

  // Render high-fidelity List View Table index inside center panel
  const renderListView = () => {
    return (
      <div className="flex-1 flex flex-col h-full bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-warm/60 bg-sand/10 flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-warm-muted">
            Showing {filteredFlatNodes.length} communities in spreadsheet index
          </span>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-warm bg-surface font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {allStates.map(s => (
              <option key={s} value={s}>{s} State</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sand/30 text-warm-muted font-bold text-[10px] uppercase border-b border-warm/80">
                <th className="p-3.5 pl-6">Community</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Administrator</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5 text-right">Members</th>
                <th className="p-3.5 text-right">Subsidiaries</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm/50 text-xs">
              {filteredFlatNodes.map((c) => {
                const isSelected = selectedNode?.id === c.id;
                return (
                   <tr 
                    key={c.id}
                    onClick={() => handleSelectNode(c)}
                    className={`hover:bg-sand/20 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5 font-semibold text-primary" : ""
                    }`}
                  >
                    <td className="p-3.5 pl-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white overflow-hidden shrink-0 shadow-xs">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <Globe className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="font-bold text-foreground">{c.name}</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        c.type.includes('Super') 
                          ? 'bg-orange-500/10 text-orange-600' 
                          : c.type.includes('Parent')
                          ? 'bg-primary/10 text-primary'
                          : 'bg-indigo-500/10 text-indigo-600'
                      }`}>
                        {c.type.replace(' Community', '')}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-foreground">{c.admin_name}</td>
                    <td className="p-3.5 text-warm-muted">{c.district ? `${c.district}, ${c.state}` : c.state}</td>
                    <td className="p-3.5 text-right font-bold text-foreground">{c.stats.total_members.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-bold text-foreground">{c.stats.total_subsidiaries}</td>
                    <td className="p-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-3.5 text-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectNode(c);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sand border border-warm hover:bg-sand/80 text-[10px] font-bold transition-all text-foreground"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDetailsContent = () => {
    if (!selectedNode) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-warm-muted">
          <Globe className="w-10 h-10 opacity-40" />
          <p className="text-xs font-semibold">Select a community node to explore details</p>
        </div>
      );
    }

    return (
      <>
        {/* Redesigned Cover & Logo block */}
        <div className="relative border border-warm rounded-2xl overflow-hidden bg-sand/20 pb-4">
          {/* Large banner image */}
          <div className="h-32 bg-gradient-to-r from-primary via-gold to-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
            <div className="absolute inset-0 bg-black/10" />
          </div>
          
          {/* Community logo overlapping banner */}
          <div className="flex px-4 -mt-10 items-end gap-4 relative z-10">
            <div className="w-20 h-20 rounded-2xl border-4 border-surface bg-surface shadow-md overflow-hidden flex items-center justify-center text-white shrink-0">
              {selectedNode.logo_url ? (
                <img src={selectedNode.logo_url} alt={selectedNode.name} className="w-full h-full object-cover" />
              ) : (
                <Globe className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-foreground text-[16px] truncate leading-tight">{selectedNode.name}</h4>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <StatusBadge status={selectedNode.status} />
                <span className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold uppercase tracking-wider">
                  {selectedNode.type}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Redesigned high-fidelity Metric Cards */}
        <div className="space-y-3">
          <h5 className="font-bold text-[10px] uppercase text-warm-muted tracking-wider">Metric Breakdown</h5>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-surface/50 border border-warm rounded-xl flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-1.5 text-warm-muted">
                <Building2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Communities</span>
              </div>
              <span className="font-bold text-lg text-foreground mt-2">{selectedNode.stats.total_subsidiaries}</span>
            </div>

            <div className="p-3 bg-surface/50 border border-warm rounded-xl flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-1.5 text-warm-muted">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Members</span>
              </div>
              <span className="font-bold text-lg text-foreground mt-2">{selectedNode.stats.total_members.toLocaleString()}</span>
            </div>

            <div className="p-3 bg-surface/50 border border-warm rounded-xl flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-1.5 text-warm-muted">
                <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Events</span>
              </div>
              <span className="font-bold text-lg text-foreground mt-2">{selectedNode.stats.active_events}</span>
            </div>

            <div className="p-3 bg-surface/50 border border-warm rounded-xl flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-1.5 text-warm-muted">
                <Briefcase className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Jobs Posted</span>
              </div>
              <span className="font-bold text-lg text-foreground mt-2">{selectedNode.stats.jobs_posted}</span>
            </div>

            <div className="p-3 bg-surface/50 border border-warm rounded-xl flex flex-col justify-between shadow-xs col-span-2">
              <div className="flex items-center gap-1.5 text-warm-muted">
                <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Donations</span>
              </div>
              <span className="font-bold text-lg text-green-600 mt-1">{formatCurrency(selectedNode.stats.donations_sum)}</span>
            </div>
          </div>
        </div>

        {/* Parent / child relationships */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="p-3 bg-surface border border-warm rounded-xl space-y-1.5">
            <span className="text-[9px] text-warm-muted uppercase font-bold block">Parent Community</span>
            {selectedNodeParent ? (
              <button 
                onClick={() => {
                  handleSelectNode(selectedNodeParent);
                }}
                className="font-bold text-xs text-primary hover:underline truncate w-full text-left block"
              >
                {selectedNodeParent.name}
              </button>
            ) : (
              <span className="text-xs text-warm-muted font-semibold">None (Root Node)</span>
            )}
          </div>
          <div className="p-3 bg-surface border border-warm rounded-xl space-y-1.5">
            <span className="text-[9px] text-warm-muted uppercase font-bold block">Child Communities</span>
            {selectedNode.children && selectedNode.children.length > 0 ? (
              <div className="text-xs font-bold text-foreground space-y-1 max-h-[80px] overflow-y-auto">
                {selectedNode.children.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => {
                      handleSelectNode(c);
                    }}
                    className="text-left text-primary hover:underline block truncate w-full"
                  >
                    • {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs text-warm-muted font-semibold">No direct children</span>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-3">
          <h5 className="font-bold text-[10px] uppercase text-warm-muted tracking-wider">Detailed Information</h5>
          
          <div className="border border-warm rounded-2xl overflow-hidden divide-y divide-warm/60">
            <div className="p-3 bg-surface flex justify-between items-center text-xs">
              <span className="text-warm-muted font-medium">Administrator</span>
              <span className="font-bold text-foreground">{selectedNode.admin_name}</span>
            </div>
            <div className="p-3 bg-surface flex justify-between items-center text-xs">
              <span className="text-warm-muted font-medium">Location</span>
              <span className="font-bold text-foreground">{selectedNode.district ? `${selectedNode.district}, ${selectedNode.state}` : selectedNode.state}</span>
            </div>
            <div className="p-3 bg-surface flex justify-between items-center text-xs">
              <span className="text-warm-muted font-medium">Ecosystem Level</span>
              <span className="font-bold text-foreground uppercase text-[10px]">{selectedNode.type}</span>
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div className="space-y-3">
          <h5 className="font-bold text-[10px] uppercase text-warm-muted tracking-wider">Gender Demographics</h5>
          <div className="p-4 bg-surface border border-warm rounded-xl space-y-3">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-blue-500 flex items-center gap-1">♂ Male ({selectedNode.stats.male_members})</span>
              <span className="text-pink-500 flex items-center gap-1">♀ Female ({selectedNode.stats.female_members})</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden bg-sand flex">
              {selectedNode.stats.total_members > 0 ? (
                <>
                  <div 
                    style={{ width: `${(selectedNode.stats.male_members / selectedNode.stats.total_members) * 100}%` }} 
                    className="bg-blue-500 h-full transition-all duration-300"
                  />
                  <div 
                    style={{ width: `${(selectedNode.stats.female_members / selectedNode.stats.total_members) * 100}%` }} 
                    className="bg-pink-500 h-full transition-all duration-300"
                  />
                </>
              ) : (
                <div className="w-full h-full bg-warm" />
              )}
            </div>
          </div>
        </div>

        {/* Cover Description */}
        <div className="space-y-2">
          <h5 className="font-bold text-[10px] uppercase text-warm-muted tracking-wider">About</h5>
          <p className="text-xs text-warm-muted leading-relaxed">
            {selectedNode.desc || `Welcome to ${selectedNode.name}, a vibrant community committed to fostering connection, progress, and mutual support among members in the ${selectedNode.district || selectedNode.state} region.`}
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <button 
            onClick={() => alert(`Redirecting to ${selectedNode.name} dashboard...`)}
            className="w-full py-3 bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-accent-dark text-white rounded-xl font-bold text-xs shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            View Full Details
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Dynamic styles */}
      <style>{`
        @keyframes flowDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-flow-dash {
          stroke-dasharray: 6, 4;
          animation: flowDash 0.8s linear infinite;
        }
        .bg-dots {
          background-size: 24px 24px;
          background-image: radial-gradient(var(--warm) 1.2px, transparent 1.2px);
        }
      `}</style>

      {/* 1. TOP ANALYTICS SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard 
          icon={<Building2 className="w-6 h-6" />}
          label="Total Communities"
          value={stats.totalComms}
          accent="primary"
        />
        <StatCard 
          icon={<Shield className="w-6 h-6" />}
          label="Parent Comms"
          value={stats.parentCount}
          accent="primary"
        />
        <StatCard 
          icon={<Building2 className="w-6 h-6" />}
          label="Subsidiaries"
          value={stats.subsidiaryCount + stats.childCount}
          accent="primary"
        />
        <StatCard 
          icon={<Users className="w-6 h-6" />}
          label="Total Members"
          value={stats.totalMembers}
          accent="gold"
        />
        <StatCard 
          icon={<CheckCircle className="w-6 h-6" />}
          label="Active Comms"
          value={stats.activeCount}
          accent="teal"
        />
        <StatCard 
          icon={<Calendar className="w-6 h-6" />}
          label="Total Events"
          value={stats.totalEvents}
          accent="gold"
        />
        <StatCard 
          icon={<Briefcase className="w-6 h-6" />}
          label="Jobs Posted"
          value={stats.totalJobs}
          accent="teal"
        />
      </div>

      {/* THREE PANEL ENTERPRISE LAYOUT */}
      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden items-center justify-center p-1 bg-sand border border-warm rounded-2xl w-full gap-1">
        <button
          onClick={() => setMobileTab("directory")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mobileTab === "directory" 
              ? "bg-primary text-white shadow-xs" 
              : "text-warm-muted hover:text-foreground"
          }`}
        >
          Directory List
        </button>
        <button
          onClick={() => setMobileTab("canvas")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mobileTab === "canvas" 
              ? "bg-primary text-white shadow-xs" 
              : "text-warm-muted hover:text-foreground"
          }`}
        >
          Topology View
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[650px] lg:h-[750px] w-full overflow-hidden items-stretch">
        
        {/* LEFT PANEL: Community Explorer */}
        <div className={`w-full lg:w-80 border border-warm bg-surface rounded-2xl flex-col h-full shrink-0 shadow-sm overflow-hidden ${mobileTab === "directory" ? "flex" : "hidden lg:flex"}`}>
          {/* Header */}
          <div className="p-4 border-b border-warm/80">
            <h3 className="font-ui font-bold text-sm text-foreground flex items-center gap-2">
              <Layout className="w-4 h-4 text-primary" />
              Community Explorer
            </h3>
            
            {/* Search Input */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-warm-muted" />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..." 
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-warm bg-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
              />
            </div>
            
            {/* Quick Tools */}
            <div className="flex gap-2 mt-3">
              <button 
                onClick={expandAll}
                className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-sand border border-warm text-foreground hover:bg-sand/80 transition-colors"
              >
                Expand All
              </button>
              <button 
                onClick={collapseAll}
                className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-sand border border-warm text-foreground hover:bg-sand/80 transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Indented Directory List Tree */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            {loading ? (
              <div className="space-y-2.5 py-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 w-full bg-sand/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredHierarchy.length === 0 ? (
              <div className="text-center py-12 text-xs text-warm-muted">
                No communities found.
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredHierarchy.map(root => renderLeftPanelExplorerNode(root))}
              </div>
            )}
          </div>

          {/* Bottom Actions: Add Root Community */}
          <div className="p-4 border-t border-warm bg-sand/10">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs shadow-sm shadow-primary/10 transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              Add Root Community
            </button>
          </div>
        </div>

        {/* CENTER PANEL: REACT FLOW CANVAS WITH DAGRE AUTO LAYOUT */}
        <div className={`flex-1 border border-warm bg-surface rounded-2xl flex-col h-full relative overflow-hidden shadow-sm ${mobileTab === "canvas" ? "flex" : "hidden lg:flex"}`}>
          {/* Canvas Toolbar Header */}
          <div className="px-4 py-3 border-b border-warm/80 bg-surface/95 backdrop-blur flex items-center justify-between z-10 flex-wrap gap-2.5">
            {/* Dynamic Breadcrumbs */}
            <div className="flex items-center gap-1 text-[11px] font-bold text-warm-muted uppercase tracking-wider min-w-0">
              <span className="shrink-0 text-warm-muted">Path:</span>
              <div className="flex items-center gap-1.5 truncate">
                {breadcrumbs ? (
                  breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && <span className="text-warm-muted">/</span>}
                      <button 
                        onClick={() => {
                          handleSelectNode(crumb);
                        }}
                        className="hover:text-primary transition-colors hover:underline truncate"
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))
                ) : (
                  <span>Select Node</span>
                )}
              </div>
            </div>

            {/* Tree View vs List View Switcher (Added to replace Horizontal/Vertical) */}
            <div className="flex items-center gap-1 rounded-xl bg-sand p-0.5 border border-warm shrink-0">
              <button
                onClick={() => setViewMode("tree")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "tree" 
                    ? "bg-primary text-white shadow-xs" 
                    : "text-warm-muted hover:text-foreground"
                }`}
              >
                Tree View
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "list" 
                    ? "bg-primary text-white shadow-xs" 
                    : "text-warm-muted hover:text-foreground"
                }`}
              >
                List View
              </button>
            </div>
          </div>

          {/* Viewport Canvas or Spreadsheet List Index */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-warm-muted gap-4">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="font-medium animate-pulse text-xs">Mapping Ecosystem Topology...</p>
            </div>
          ) : viewMode === "tree" ? (
            <ReactFlowProvider>
              <InnerFlowCanvas
                nodes={flowNodes}
                edges={flowEdges}
                onSelectNode={(n) => handleSelectNode(n)}
                selectedNode={selectedNode}
                expandAll={expandAll}
                collapseAll={collapseAll}
              />
            </ReactFlowProvider>
          ) : (
            renderListView()
          )}

          {/* Footer controls legend */}
          <div className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-warm text-[10px] text-warm-muted font-bold shadow-xs pointer-events-none z-10">
            💡 Drag canvas background to pan. Zoom in/out to scale. Click nodes to focus.
          </div>
        </div>

        {/* RIGHT PANEL: Community Details drawer (Desktop only) */}
        <div className="hidden lg:flex lg:w-96 border border-warm bg-surface rounded-2xl flex-col h-full shrink-0 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-warm/80 bg-sand/10 shrink-0">
            <h3 className="font-ui font-bold text-sm text-foreground flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              Community Node Details
            </h3>
          </div>

          {/* Panel Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
            {renderDetailsContent()}
          </div>
        </div>

      </div>

      {/* CREATE COMMUNITY MODAL */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Root or Subsidiary Community"
        size="md"
      >
        <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-warm-muted uppercase">Community Name *</label>
            <input
              type="text"
              required
              value={newCommName}
              onChange={(e) => setNewCommName(e.target.value)}
              placeholder="e.g. Surat Community"
              className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-warm-muted uppercase">State</label>
              <input
                type="text"
                value={newCommState}
                onChange={(e) => setNewCommState(e.target.value)}
                placeholder="Gujarat"
                className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-warm-muted uppercase">District</label>
              <input
                type="text"
                value={newCommDistrict}
                onChange={(e) => setNewCommDistrict(e.target.value)}
                placeholder="Surat"
                className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-warm-muted uppercase">Parent Community (Optional)</label>
            <select
              value={newCommParentId}
              onChange={(e) => setNewCommParentId(e.target.value)}
              className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
            >
              <option value="">None (Create as Root / Super Community)</option>
              {flatComms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-warm-muted block mt-1">
              Selecting a parent community automatically configures this node as a Subsidiary or Child.
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-warm-muted uppercase">Description</label>
            <textarea
              rows={3}
              value={newCommDesc}
              onChange={(e) => setNewCommDesc(e.target.value)}
              placeholder="Short summary of this community..."
              className="w-full px-3 py-2 border border-warm rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-warm bg-sand hover:bg-sand/80 font-bold text-xs text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Community"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MOBILE DETAILS MODAL */}
      <Modal
        open={isMobileDetailsOpen}
        onClose={() => setIsMobileDetailsOpen(false)}
        title="Community Node Details"
        size="md"
      >
        <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1 pb-4">
          {renderDetailsContent()}
        </div>
      </Modal>
    </div>
  );
};
