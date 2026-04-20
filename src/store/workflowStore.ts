import { create } from "zustand";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import {
  START_NODE_ID,
  type WorkflowEdgeData,
  type WorkflowNodeData,
} from "../types/workflow";

function createStartNode(): Node<WorkflowNodeData> {
  return {
    id: START_NODE_ID,
    type: "start",
    position: { x: 0, y: 0 },
    data: {
      label: "Start Call",
      nodeType: "start",
    },
    deletable: false,
    draggable: false,
  };
}

interface WorkflowStore {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge<WorkflowEdgeData>[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  setNodes: (nodes: Node<WorkflowNodeData>[], options?: { dirty?: boolean }) => void;
  setEdges: (edges: Edge<WorkflowEdgeData>[], options?: { dirty?: boolean }) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (node: Node<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  addWorkflowEdge: (edge: Edge<WorkflowEdgeData>) => void;
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void;
  updateEdgeData: (id: string, data: Partial<WorkflowEdgeData>) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setIsSaving: (value: boolean) => void;
  markClean: () => void;
  initializeWorkflow: (options?: { dirty?: boolean }) => void;
  resetWorkflow: () => void;
}

const INITIAL_STATE = {
  nodes: [] as Node<WorkflowNodeData>[],
  edges: [] as Edge<WorkflowEdgeData>[],
  selectedNodeId: null as string | null,
  selectedEdgeId: null as string | null,
  isDirty: false,
  isSaving: false,
};

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  ...INITIAL_STATE,

  setNodes: (nodes, options) =>
    set({
      nodes,
      isDirty: options?.dirty ?? true,
    }),

  setEdges: (edges, options) =>
    set({
      edges,
      isDirty: options?.dirty ?? true,
    }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      isDirty: true,
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: true,
    })),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    })),

  deleteNode: (nodeId) =>
    set((state) => {
      if (nodeId === START_NODE_ID) return state;
      const newNodes = state.nodes.filter((n) => n.id !== nodeId);
      const newEdges = state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      );
      return {
        nodes: newNodes,
        edges: newEdges,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        selectedEdgeId: state.selectedEdgeId,
        isDirty: true,
      };
    }),

  addWorkflowEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
      isDirty: true,
    })),

  updateNodeData: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: { ...node.data, ...data } as WorkflowNodeData,
            }
          : node,
      ),
      isDirty: true,
    })),

  updateEdgeData: (id, data) =>
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === id
          ? {
              ...edge,
              data: { ...edge.data, ...data } as WorkflowEdgeData,
            }
          : edge,
      ),
      isDirty: true,
    })),

  setSelectedNodeId: (id) =>
    set({
      selectedNodeId: id,
      selectedEdgeId: null,
    }),

  setSelectedEdgeId: (id) =>
    set({
      selectedEdgeId: id,
      selectedNodeId: null,
    }),

  setIsSaving: (value) =>
    set({
      isSaving: value,
    }),

  markClean: () =>
    set({
      isDirty: false,
    }),

  initializeWorkflow: (options) =>
    set({
      ...INITIAL_STATE,
      nodes: [createStartNode()],
      isDirty: options?.dirty ?? false,
    }),

  resetWorkflow: () =>
    set({
      ...INITIAL_STATE,
    }),
}));
