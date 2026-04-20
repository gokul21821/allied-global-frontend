import type { Edge, Node } from "@xyflow/react";
import { START_NODE_ID } from "../types/workflow";
import type { WorkflowEdgeData, WorkflowNodeData } from "../types/workflow";

/** ElevenLabs API expects "start_node" as the start node id */
const ELEVENLABS_START_NODE_ID = "start_node";

/** ElevenLabs workflow output format (sent to backend/ElevenLabs API) - objects keyed by id */
export interface ElevenLabsWorkflow {
  nodes: Record<string, ElevenLabsWorkflowNode>;
  edges: Record<string, ElevenLabsWorkflowEdge>;
}

export interface ElevenLabsWorkflowNode {
  type: string;
  label?: string;
  position?: { x: number; y: number };
  edge_order?: string[];
  /** Exactly one node (the start node) has is_start: true. Auto-detected as node with no incoming edges. */
  is_start?: boolean;
  conversation_config?: Record<string, unknown>;
  additional_prompt?: string;
  additional_tool_ids?: string[];
  /** ElevenLabs KnowledgeBaseLocator: type, name, id required; usage_mode optional (default auto). */
  additional_knowledge_base?: ElevenLabsKnowledgeBaseLocator[];
  tools?: { tool_id: string }[];
  transfer_destination?: { type: string; phone_number: string };
  agent_id?: string;
  transfer_message?: string | null;
  [key: string]: unknown;
}

/** ElevenLabs WorkflowEdgeModelInput: source, target, forward_condition, backward_condition */
export interface ElevenLabsWorkflowEdge {
  source: string;
  target: string;
  /** Always present. Use { type: "unconditional" } for "Always" edges. Null only for backward-only edges. */
  forward_condition:
    | { type: "llm"; condition: string; label: string | null }
    | { type: "expression"; expression: string; label: string | null }
    | { type: "unconditional"; label?: string | null }
    | null;
  /** Null for forward-only edges. Set for backward/loop edges. */
  backward_condition:
    | { type: "llm"; condition: string; label: string | null }
    | { type: "expression"; expression: string; label: string | null }
    | null;
}

/** Matches ElevenLabs DocumentUsageModeEnum; dashboard default is "auto". */
export type ElevenLabsDocumentUsageMode = "prompt" | "auto";

export interface ElevenLabsKnowledgeBaseLocator {
  type: "file" | "url" | "text";
  name: string;
  id: string;
  usage_mode?: ElevenLabsDocumentUsageMode;
}

/**
 * Maps frontend node id to ElevenLabs id (start-node -> start_node).
 */
function toApiNodeId(id: string): string {
  return id === START_NODE_ID ? ELEVENLABS_START_NODE_ID : id;
}

/**
 * Recursively removes undefined values from an object. Converts to plain JSON-safe structure.
 */
function sanitizeForJson<T>(obj: T): T {
  if (obj === undefined) {
    return obj;
  }
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForJson(item)) as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === undefined) continue;
    const sanitized = sanitizeForJson(value);
    if (sanitized !== undefined) {
      result[key] = sanitized;
    }
  }
  return result as T;
}

function toElevenLabsKnowledgeBaseLocators(
  items: { id: string; name: string; type: string }[],
): ElevenLabsKnowledgeBaseLocator[] {
  return items.map((kb) => {
    const t =
      kb.type === "file" || kb.type === "url" || kb.type === "text"
        ? kb.type
        : "file";
    return {
      id: kb.id,
      name: (kb.name?.trim() || kb.id).trim(),
      type: t,
      usage_mode: "auto",
    };
  });
}

/**
 * Serializes React Flow workflow to ElevenLabs API format.
 * - Outputs nodes and edges as objects (ElevenLabs AgentWorkflowRequestModel)
 * - Uses source/target and forward_condition (ElevenLabs WorkflowEdgeModelInput)
 * - override_agent uses label; tool uses tools array; phone_number uses transfer_destination
 */
export function serializeWorkflow(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge<WorkflowEdgeData>[],
): ElevenLabsWorkflow {
  const persistedNodeIds = new Set(nodes.map((node) => node.id));
  const elNodes: Record<string, ElevenLabsWorkflowNode> = {};
  const elEdges: Record<string, ElevenLabsWorkflowEdge> = {};
  const edgesBySource = new Map<string, string[]>();
  persistedNodeIds.add(START_NODE_ID);

  let edgeIndex = 0;
  for (const edge of edges) {
    if (
      !persistedNodeIds.has(edge.source) ||
      !persistedNodeIds.has(edge.target)
    ) {
      continue;
    }

    const data = edge.data;
    const trimmedForwardCondition = data?.forwardCondition?.trim() ?? "";
    const trimmedBackwardCondition = data?.backwardCondition?.trim() ?? "";
    const forwardLabel = data?.forwardLabel?.trim() || null;
    const backwardLabel = data?.backwardLabel?.trim() || null;

    const forwardType = data?.forwardConditionType ?? "none";
    const backwardType = data?.backwardConditionType ?? "none";

    const buildForwardCondition = (): ElevenLabsWorkflowEdge["forward_condition"] => {
      if (forwardType === "none") {
        return { type: "unconditional" as const, label: forwardLabel };
      }
      if (forwardType === "expression") {
        return {
          type: "expression" as const,
          expression: trimmedForwardCondition || "true",
          label: forwardLabel,
        };
      }
      return {
        type: "llm" as const,
        condition: trimmedForwardCondition || "Proceed",
        label: forwardLabel,
      };
    };

    const buildBackwardCondition = (): ElevenLabsWorkflowEdge["backward_condition"] => {
      if (backwardType === "none") {
        return null;
      }
      if (backwardType === "expression") {
        return {
          type: "expression" as const,
          expression: trimmedBackwardCondition || "true",
          label: backwardLabel,
        };
      }
      return {
        type: "llm" as const,
        condition: trimmedBackwardCondition || "Proceed",
        label: backwardLabel,
      };
    };

    const edgeId = `edge-${edgeIndex}`;
    elEdges[edgeId] = {
      source: toApiNodeId(edge.source),
      target: toApiNodeId(edge.target),
      forward_condition: buildForwardCondition(),
      backward_condition: buildBackwardCondition(),
    };

    const sourceId = toApiNodeId(edge.source);
    const list = edgesBySource.get(sourceId) ?? [];
    list.push(edgeId);
    edgesBySource.set(sourceId, list);
    edgeIndex += 1;
  }

  // Always include start node first (required by ElevenLabs - "Workflow must contain a start node")
  // Exactly one node has is_start: true (the node with no incoming edges = start).
  const startNodeInStore = nodes.find((n) => n.data.nodeType === "start");
  elNodes[ELEVENLABS_START_NODE_ID] = {
    type: "start",
    is_start: true,
    position: startNodeInStore
      ? { x: startNodeInStore.position.x, y: startNodeInStore.position.y }
      : { x: 0, y: 0 },
    edge_order: edgesBySource.get(ELEVENLABS_START_NODE_ID) ?? [],
  };

  for (const node of nodes) {
    const data = node.data;

    switch (data.nodeType) {
      case "start":
        break;
      case "subagent": {
        const nodeOut: ElevenLabsWorkflowNode = {
          type: "override_agent",
          label: data.label || node.id.replace(/_/g, " "),
          position: { x: node.position.x, y: node.position.y },
          edge_order: edgesBySource.get(node.id) ?? [],
        };
        const trimmedPrompt = data.systemPrompt?.trim() ?? "";
        const turnEagerness = data.turnEagerness;
        const turnEagernessValue =
          turnEagerness === "eager" || turnEagerness === "patient"
            ? turnEagerness
            : null;

        const conversationConfig: Record<string, unknown> = {
          agent: {
            prompt: trimmedPrompt
              ? data.systemPromptOverride
                ? {
                    prompt: trimmedPrompt,
                    llm: data.llm?.trim() || null,
                    built_in_tools: {},
                  }
                : {
                    prompt: null,
                    llm: data.llm?.trim() || null,
                    built_in_tools: {},
                  }
              : {
                  prompt: null,
                  llm: data.llm?.trim() || null,
                  built_in_tools: {},
                },
          },
        };

        const turnConfig: Record<string, unknown> = {};
        if (turnEagernessValue !== null) {
          turnConfig.turn_eagerness = turnEagernessValue;
        }
        if (Object.keys(turnConfig).length > 0) {
          conversationConfig.turn = turnConfig;
        }

        const voiceId =
          typeof data.voiceId === "string" ? data.voiceId.trim() : "";
        if (voiceId) {
          conversationConfig.tts = { voice_id: voiceId };
        }

        if (Object.keys(conversationConfig).length > 0) {
          nodeOut.conversation_config = conversationConfig;
        }
        if (trimmedPrompt && !data.systemPromptOverride) {
          nodeOut.additional_prompt = trimmedPrompt;
        }
        if (data.toolIds?.length) {
          nodeOut.additional_tool_ids = data.toolIds;
        }
        if (data.knowledgeBase?.length) {
          nodeOut.additional_knowledge_base = toElevenLabsKnowledgeBaseLocators(
            data.knowledgeBase,
          );
        }
        elNodes[node.id] = nodeOut;
        break;
      }
      case "tool_call": {
        elNodes[node.id] = {
          type: "tool",
          label: data.label || node.id,
          position: { x: node.position.x, y: node.position.y },
          edge_order: edgesBySource.get(node.id) ?? [],
          tools: data.toolId ? [{ tool_id: data.toolId }] : [],
        };
        break;
      }
      case "transfer_to_number": {
        elNodes[node.id] = {
          type: "phone_number",
          label: data.label || node.id,
          position: { x: node.position.x, y: node.position.y },
          edge_order: edgesBySource.get(node.id) ?? [],
          transfer_destination: {
            type: "phone",
            phone_number: data.phoneNumber || "",
          },
          transfer_message: data.message ?? null,
        };
        break;
      }
      case "agent_transfer": {
        elNodes[node.id] = {
          type: "standalone_agent",
          label: data.label || node.id,
          position: { x: node.position.x, y: node.position.y },
          edge_order: edgesBySource.get(node.id) ?? [],
          agent_id: data.agentId || "",
          transfer_message: data.message || undefined,
        };
        break;
      }
      case "end":
        elNodes[node.id] = {
          type: "end",
          label: data.label || "End",
          position: { x: node.position.x, y: node.position.y },
          edge_order: edgesBySource.get(node.id) ?? [],
        };
        break;
    }
  }

  return sanitizeForJson({ nodes: elNodes, edges: elEdges });
}
