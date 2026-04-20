import type { Edge, Node } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { START_NODE_ID } from "../types/workflow";
import type { WorkflowEdgeData, WorkflowNodeData } from "../types/workflow";
import type { ElevenLabsWorkflow } from "./workflowSerializer";

/** ElevenLabs API uses "start_node" as the start node id; keep "start" as legacy fallback */
const ELEVENLABS_START_NODE_ID = "start_node";
const LEGACY_ELEVENLABS_START_NODE_ID = "start";

/** Normalized node from either array or object format */
interface NormalizedNode {
  id: string;
  type: string;
  [key: string]: unknown;
}

/** Normalized edge from either array or object format */
interface NormalizedEdge {
  source: string;
  target: string;
  forwardCondition: string;
  forwardConditionType: "llm" | "expression" | "none";
  forwardLabel: string;
  backwardCondition: string;
  backwardConditionType: "llm" | "expression" | "none";
  backwardLabel: string;
}

interface KnowledgeDoc {
  id: string;
  name: string;
  type: string;
}

/** Workflow from backend: ElevenLabs array format or legacy object format */
type WorkflowInput =
  | ElevenLabsWorkflow
  | {
      nodes?:
        | Record<string, { type: string; config?: Record<string, unknown>; [key: string]: unknown }>
        | { id: string; type: string; [key: string]: unknown }[];
      edges?:
        | Record<
            string,
            {
              source?: string;
              target?: string;
              source_node_id?: string;
              target_node_id?: string;
              condition?: string | { type?: string; condition?: string; expression?: string };
              forward_condition?: { type?: string; condition?: string; expression?: string };
              backward_condition?: { type?: string; condition?: string; expression?: string };
              is_backward?: boolean;
            }
          >
        | { source_node_id: string; target_node_id: string; condition?: string }[];
    };

const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;
const DEFAULT_LLM = "gemini-2.0-flash-001";

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

function asNodeConfig(node: Record<string, unknown>): Record<string, unknown> {
  return (node?.config ?? node) as Record<string, unknown>;
}

function getPositionFromNode(node: Record<string, unknown>): { x: number; y: number } {
  const pos = node.position as { x?: number; y?: number } | undefined;
  if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
    return { x: pos.x, y: pos.y };
  }
  return { x: 0, y: 0 };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function toKnowledgeBase(
  value: unknown,
  knowledgeDocsById: Map<string, KnowledgeDoc>,
): { id: string; name: string; type: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { id: string; name?: string; type?: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { id?: unknown }).id === "string",
    )
    .map((item) => {
      const kbDoc = knowledgeDocsById.get(item.id);
      return {
        id: item.id,
        name:
          typeof item.name === "string"
            ? item.name
            : kbDoc?.name ?? item.id,
        type:
          typeof item.type === "string"
            ? item.type
            : kbDoc?.type ?? "document",
      };
    });
}

function applyDagreLayout(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge<WorkflowEdgeData>[],
): Node<WorkflowNodeData>[] {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "TB",
    nodesep: 80,
    ranksep: 140,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id);
    if (!position) return node;
    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });
}

function findEntryNodeId(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge<WorkflowEdgeData>[],
): string | null {
  const incomingTargets = new Set(edges.map((edge) => edge.target));
  const firstRoot = nodes.find((node) => !incomingTargets.has(node.id));
  return firstRoot?.id ?? nodes[0]?.id ?? null;
}

const SUPPORTED_NODE_TYPES = new Set([
  "subagent",
  "override_agent",
  "tool_call",
  "tool",
  "transfer_to_number",
  "phone_number",
  "agent_transfer",
  "standalone_agent",
  "end",
]);

function isSupportedNodeType(type: string): boolean {
  return SUPPORTED_NODE_TYPES.has(type);
}

function isApiStartNodeId(id: string): boolean {
  return id === ELEVENLABS_START_NODE_ID || id === LEGACY_ELEVENLABS_START_NODE_ID;
}

/** Normalize nodes from array or object format to unified array */
function getNormalizedNodes(workflow: WorkflowInput): NormalizedNode[] {
  const raw = workflow.nodes;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .filter((n) => n && typeof n === "object" && typeof (n as { type?: unknown }).type === "string")
      .map((n) => {
        const node = n as { id?: string; type: string; [key: string]: unknown };
        const id = typeof node.id === "string" ? node.id : String((raw as unknown[]).indexOf(n));
        return { ...node, id, type: node.type };
      });
  }

  return Object.entries(raw).map(([id, node]) => {
    const n = node as { type: string; [key: string]: unknown };
    return { ...n, id, type: n.type };
  });
}

/** Valid node ids: persisted nodes + our start node */
function isValidNodeId(id: string, nodeIds: Set<string>): boolean {
  return id === START_NODE_ID || isApiStartNodeId(id) || nodeIds.has(id);
}

/** Normalize edges from array or object format to unified array. Maps API start ids to START_NODE_ID. */
function getNormalizedEdges(
  workflow: WorkflowInput,
  nodeIds: Set<string>,
): NormalizedEdge[] {
  const raw = workflow.edges;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .filter((e) => {
        const src = (e as { source_node_id?: string; source?: string }).source_node_id ?? (e as { source?: string }).source;
        const tgt = (e as { target_node_id?: string; target?: string }).target_node_id ?? (e as { target?: string }).target;
        return isValidNodeId(src ?? "", nodeIds) && isValidNodeId(tgt ?? "", nodeIds);
      })
      .map((e) => {
        const edge = e as {
          source_node_id?: string;
          target_node_id?: string;
          source?: string;
          target?: string;
          condition?: string;
        };
        const src = edge.source_node_id ?? edge.source ?? "";
        const tgt = edge.target_node_id ?? edge.target ?? "";
        const source = isApiStartNodeId(src) ? START_NODE_ID : src;
        const target = isApiStartNodeId(tgt) ? START_NODE_ID : tgt;
        const condition = typeof edge.condition === "string" ? edge.condition : "";
        return {
          source,
          target,
          forwardCondition: condition,
          forwardConditionType: condition ? "llm" : "none",
          forwardLabel: condition,
          backwardCondition: "",
          backwardConditionType: "none",
          backwardLabel: "",
        };
      });
  }

  return Object.entries(raw)
    .filter(([, edge]) => {
      const src = (edge as { source_node_id?: string; source?: string }).source_node_id ?? (edge as { source?: string }).source;
      const tgt = (edge as { target_node_id?: string; target?: string }).target_node_id ?? (edge as { target?: string }).target;
      return src && tgt && isValidNodeId(src, nodeIds) && isValidNodeId(tgt, nodeIds);
    })
    .map(([, edge]) => {
      const e = edge as {
        source_node_id?: string;
        target_node_id?: string;
        source?: string;
        target?: string;
        condition?: string | { type?: string; condition?: string; expression?: string; label?: string | null };
        forward_condition?: { type?: string; condition?: string; expression?: string; label?: string | null };
        backward_condition?: { type?: string; condition?: string; expression?: string; label?: string | null } | null;
        is_backward?: boolean;
      };
      const src = e.source_node_id ?? e.source ?? "";
      const tgt = e.target_node_id ?? e.target ?? "";
      const source = isApiStartNodeId(src) ? START_NODE_ID : src;
      const target = isApiStartNodeId(tgt) ? START_NODE_ID : tgt;

      const forwardCond = (e.condition ?? e.forward_condition) as
        | string
        | { type?: string; condition?: string; expression?: string; label?: string | null }
        | null
        | undefined;
      const forwardValue =
        typeof forwardCond === "string"
          ? forwardCond
          : forwardCond?.condition ??
            (forwardCond as { expression?: string })?.expression ??
            "";
      const forwardTypeRaw =
        typeof forwardCond === "string"
          ? "llm"
          : (forwardCond as { type?: string })?.type;
      const forwardConditionType: "llm" | "expression" | "none" =
        forwardTypeRaw === "expression"
          ? "expression"
          : forwardTypeRaw === "unconditional" || !forwardValue
            ? "none"
            : "llm";
      const forwardLabel =
        typeof (forwardCond as { label?: string | null })?.label === "string"
          ? ((forwardCond as { label: string }).label)
          : forwardValue;

      const backwardCond = e.backward_condition;
      const backwardValue =
        backwardCond?.condition ??
        (backwardCond as { expression?: string } | null)?.expression ??
        "";
      const backwardTypeRaw = backwardCond?.type;
      const backwardConditionType: "llm" | "expression" | "none" =
        backwardTypeRaw === "expression"
          ? "expression"
          : backwardTypeRaw
            ? "llm"
            : "none";
      const backwardLabel =
        typeof backwardCond?.label === "string"
          ? backwardCond.label
          : backwardValue;

      return {
        source,
        target,
        forwardCondition: forwardValue,
        forwardConditionType,
        forwardLabel,
        backwardCondition: backwardValue,
        backwardConditionType,
        backwardLabel,
      };
    });
}

export function deserializeWorkflow(
  workflow: unknown,
  knowledgeDocs: KnowledgeDoc[] = [],
): {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge<WorkflowEdgeData>[];
} {
  let parsedRaw: unknown;
  if (typeof workflow === "string") {
    try {
      parsedRaw = JSON.parse(workflow);
    } catch {
      return { nodes: [], edges: [] };
    }
  } else {
    parsedRaw = workflow;
  }

  if (!parsedRaw || typeof parsedRaw !== "object") {
    return { nodes: [], edges: [] };
  }

  const parsed = parsedRaw as WorkflowInput;
  const knowledgeDocsById = new Map(knowledgeDocs.map((doc) => [doc.id, doc]));
  const normalizedNodes = getNormalizedNodes(parsed);

  const rawNodes: Node<WorkflowNodeData>[] = normalizedNodes
    .filter((node) => node.type !== "start" && isSupportedNodeType(node.type))
    .map((node) => {
      const nodeTyped = node as { type: string; id: string; [key: string]: unknown };
      const config = asNodeConfig(nodeTyped);

      switch (nodeTyped.type) {
        case "subagent":
        case "override_agent": {
          const convConfig = nodeTyped.conversation_config as
            | {
                agent?: {
                  prompt?: string | { prompt?: string | null; llm?: string | null };
                };
                turn?: { turn_eagerness?: string | null };
                tts?: { voice_id?: string | null };
              }
            | undefined;
          const agentPromptObj = convConfig?.agent?.prompt;
          const promptFromConv =
            typeof agentPromptObj === "string"
              ? agentPromptObj.trim()
              : (agentPromptObj as { prompt?: string | null })?.prompt?.trim() ?? "";
          const additionalPrompt =
            typeof nodeTyped.additional_prompt === "string"
              ? nodeTyped.additional_prompt.trim()
              : "";

          // ElevenLabs API: override = prompt in conversation_config.agent.prompt.prompt
          // append = prompt in additional_prompt, conversation_config.agent.prompt.prompt = null
          const systemPromptOverride = promptFromConv.length > 0;
          const systemPrompt =
            promptFromConv.length > 0 ? promptFromConv : additionalPrompt;

          const additionalToolIds = Array.isArray(nodeTyped.additional_tool_ids)
            ? nodeTyped.additional_tool_ids
            : toStringArray(config.tool_ids);
          const additionalKb = Array.isArray(nodeTyped.additional_knowledge_base)
            ? nodeTyped.additional_knowledge_base
            : config.knowledge_base;
          const label =
            typeof nodeTyped.name === "string"
              ? nodeTyped.name
              : typeof nodeTyped.label === "string"
                ? nodeTyped.label
                : nodeTyped.id.replace(/_/g, " ");

          return {
            id: nodeTyped.id,
            type: "subagent",
            position: getPositionFromNode(nodeTyped),
            data: {
              label,
              nodeType: "subagent",
              systemPrompt,
              systemPromptOverride,
              llm: (() => {
                const fromPrompt = (convConfig?.agent?.prompt as { llm?: string | null } | undefined)?.llm;
                const fromConfig = config.llm;
                const val = fromPrompt ?? fromConfig;
                return typeof val === "string" ? val : DEFAULT_LLM;
              })(),
              voiceId: (() => {
                const fromTts = convConfig?.tts?.voice_id;
                const fromConfig = config.voice_id;
                const val = fromTts ?? fromConfig;
                return typeof val === "string" ? val : "";
              })(),
              toolIds: additionalToolIds,
              knowledgeBase: toKnowledgeBase(additionalKb, knowledgeDocsById),
              turnEagerness: (() => {
                const fromTurn = convConfig?.turn?.turn_eagerness;
                const fromConfig = config.turn_eagerness;
                const val = fromTurn ?? fromConfig;
                return val === "eager" || val === "patient" ? val : "normal";
              })(),
            },
          };
        }
        case "tool_call":
        case "tool": {
          let toolId =
            typeof nodeTyped.tool_id === "string"
              ? nodeTyped.tool_id
              : typeof config.tool_id === "string"
                ? config.tool_id
                : "";
          if (!toolId && Array.isArray(nodeTyped.tools) && nodeTyped.tools.length > 0) {
            const first = nodeTyped.tools[0] as { tool_id?: string };
            toolId = typeof first.tool_id === "string" ? first.tool_id : "";
          }

          return {
            id: nodeTyped.id,
            type: "tool_call",
            position: getPositionFromNode(nodeTyped),
            data: {
              label: typeof nodeTyped.label === "string" ? nodeTyped.label : (typeof nodeTyped.name === "string" ? nodeTyped.name : nodeTyped.id),
              nodeType: "tool_call",
              toolId,
            },
          };
        }
        case "transfer_to_number":
        case "phone_number": {
          let phoneNumber =
            typeof nodeTyped.phone_number === "string"
              ? nodeTyped.phone_number
              : typeof config.phone_number === "string"
                ? config.phone_number
                : undefined;
          const transferDest = nodeTyped.transfer_destination as { type?: string; phone_number?: string } | undefined;
          if (!phoneNumber && transferDest && typeof transferDest.phone_number === "string") {
            phoneNumber = transferDest.phone_number;
          }

          return {
            id: nodeTyped.id,
            type: "transfer_to_number",
            position: getPositionFromNode(nodeTyped),
            data: {
              label: typeof nodeTyped.label === "string" ? nodeTyped.label : (typeof nodeTyped.name === "string" ? nodeTyped.name : nodeTyped.id),
              nodeType: "transfer_to_number",
              phoneNumber,
            },
          };
        }
        case "agent_transfer":
        case "standalone_agent": {
          const agentId =
            typeof nodeTyped.agent_id === "string"
              ? nodeTyped.agent_id
              : typeof config.agent_id === "string"
                ? config.agent_id
                : undefined;
          const message =
            typeof nodeTyped.transfer_message === "string"
              ? nodeTyped.transfer_message
              : typeof config.message === "string"
                ? config.message
                : undefined;

          return {
            id: nodeTyped.id,
            type: "agent_transfer",
            position: getPositionFromNode(nodeTyped),
            data: {
              label: typeof nodeTyped.label === "string" ? nodeTyped.label : (typeof nodeTyped.name === "string" ? nodeTyped.name : nodeTyped.id),
              nodeType: "agent_transfer",
              agentId,
              message,
            },
          };
        }
        case "end":
        default:
          return {
            id: nodeTyped.id,
            type: "end",
            position: getPositionFromNode(nodeTyped),
            data: {
              label: typeof nodeTyped.label === "string" ? nodeTyped.label : (typeof nodeTyped.name === "string" ? nodeTyped.name : "End"),
              nodeType: "end",
            },
          };
      }
    });

  const nodeIds = new Set(rawNodes.map((node) => node.id));

  const normalizedEdges = getNormalizedEdges(parsed, nodeIds);

  const edges: Edge<WorkflowEdgeData>[] = normalizedEdges.map((edge, i) => ({
    id: `edge-${i}`,
    source: edge.source,
    target: edge.target,
    type: "workflowEdge",
    data: {
      forwardConditionType: edge.forwardConditionType,
      forwardCondition: edge.forwardCondition,
      forwardLabel: edge.forwardLabel,
      backwardConditionType: edge.backwardConditionType,
      backwardCondition: edge.backwardCondition,
      backwardLabel: edge.backwardLabel,
    },
  }));

  const entryNodeId = findEntryNodeId(rawNodes, edges);
  const startNode = createStartNode();
  const nodesWithStart = [startNode, ...rawNodes];

  const edgesWithStart =
    entryNodeId && !edges.some((e) => e.source === START_NODE_ID)
      ? [
          {
            id: `${START_NODE_ID}-${entryNodeId}`,
            source: START_NODE_ID,
            target: entryNodeId,
            type: "workflowEdge",
            data: {
              forwardConditionType: "none",
              forwardCondition: "",
              forwardLabel: "",
              backwardConditionType: "none",
              backwardCondition: "",
              backwardLabel: "",
            },
          } satisfies Edge<WorkflowEdgeData>,
          ...edges,
        ]
      : edges;

  return {
    nodes: applyDagreLayout(nodesWithStart, edgesWithStart),
    edges: edgesWithStart,
  };
}
