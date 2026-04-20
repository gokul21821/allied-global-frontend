// ElevenLabs API shapes (persisted via backend)

export const START_NODE_ID = "start-node";

export type ELNodeType =
  | "subagent"
  | "tool_call"
  | "agent_transfer"
  | "transfer_to_number"
  | "end";

export interface ELSubagentConfig {
  system_prompt?: string;
  system_prompt_override?: boolean;
  llm?: string;
  voice_id?: string;
  tool_ids?: string[];
  knowledge_base?: { id: string; name: string; type: string }[];
  turn_eagerness?: "eager" | "normal" | "patient";
}

export interface ELToolCallConfig {
  tool_id: string;
}

export interface ELTransferConfig {
  phone_number?: string;
  agent_id?: string;
  message?: string;
}

export interface ELWorkflowNode {
  type: ELNodeType;
  config?: ELSubagentConfig | ELToolCallConfig | ELTransferConfig;
}

export type ELConditionType = "llm" | "expression" | "none";

export interface ELForwardCondition {
  type: ELConditionType;
  condition?: string;
  expression?: string;
}

export interface ELWorkflowEdge {
  source: string;
  target: string;
  forward_condition?: ELForwardCondition;
  backward_condition?: ELForwardCondition | null;
}

export interface ELWorkflow {
  nodes: Record<string, ELWorkflowNode>;
  edges: Record<string, ELWorkflowEdge>;
}

// React Flow canvas shapes (frontend-only state)

export interface SubagentNodeData extends Record<string, unknown> {
  label: string;
  nodeType: "subagent";
  systemPrompt: string;
  systemPromptOverride: boolean;
  llm: string;
  voiceId: string;
  toolIds: string[];
  knowledgeBase: { id: string; name: string; type: string }[];
  turnEagerness: "eager" | "normal" | "patient";
}

export interface ToolCallNodeData extends Record<string, unknown> {
  label: string;
  nodeType: "tool_call";
  toolId: string;
}

export interface TransferNodeData extends Record<string, unknown> {
  label: string;
  nodeType: "transfer_to_number" | "agent_transfer";
  phoneNumber?: string;
  agentId?: string;
  message?: string;
}

export interface EndNodeData extends Record<string, unknown> {
  label: string;
  nodeType: "end";
}

export interface StartNodeData extends Record<string, unknown> {
  label: string;
  nodeType: "start";
}

export type WorkflowNodeData =
  | SubagentNodeData
  | ToolCallNodeData
  | TransferNodeData
  | EndNodeData
  | StartNodeData;

export interface WorkflowEdgeData extends Record<string, unknown> {
  forwardConditionType: "llm" | "expression" | "none";
  forwardCondition: string;
  forwardLabel: string;
  backwardConditionType: "llm" | "expression" | "none";
  backwardCondition: string;
  backwardLabel: string;
}
