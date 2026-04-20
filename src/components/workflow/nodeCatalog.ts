import {
  ArrowRightLeft,
  Brain,
  CircleOff,
  Phone,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { WorkflowNodeData } from "../../types/workflow";

export type PaletteNodeType =
  | "subagent"
  | "tool_call"
  | "transfer_to_number"
  | "agent_transfer"
  | "end";

export interface PaletteItem {
  nodeType: PaletteNodeType;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  {
    nodeType: "subagent",
    label: "Subagent",
    icon: Brain,
    color: "#65a30d",
    description: "Conversational phase with dedicated prompt",
  },
  {
    nodeType: "tool_call",
    label: "Tool Call",
    icon: Zap,
    color: "#f59e0b",
    description: "Guaranteed tool execution point",
  },
  {
    nodeType: "transfer_to_number",
    label: "Transfer to Human",
    icon: Phone,
    color: "#10b981",
    description: "Hand off to a live phone number",
  },
  {
    nodeType: "agent_transfer",
    label: "Agent Transfer",
    icon: ArrowRightLeft,
    color: "#8b5cf6",
    description: "Route to another agent",
  },
  {
    nodeType: "end",
    label: "End",
    icon: CircleOff,
    color: "#6b7280",
    description: "Terminate the conversation",
  },
];

export function makeNodeData(nodeType: PaletteNodeType): WorkflowNodeData {
  switch (nodeType) {
    case "subagent":
      return {
        label: "Subagent",
        nodeType: "subagent",
        systemPrompt: "",
        systemPromptOverride: false,
        llm: "gemini-2.0-flash-001",
        voiceId: "",
        toolIds: [],
        knowledgeBase: [],
        turnEagerness: "normal",
      };
    case "tool_call":
      return {
        label: "Tool Call",
        nodeType: "tool_call",
        toolId: "",
      };
    case "transfer_to_number":
      return {
        label: "Transfer to Human",
        nodeType: "transfer_to_number",
      };
    case "agent_transfer":
      return {
        label: "Agent Transfer",
        nodeType: "agent_transfer",
      };
    case "end":
    default:
      return {
        label: "End",
        nodeType: "end",
      };
  }
}
