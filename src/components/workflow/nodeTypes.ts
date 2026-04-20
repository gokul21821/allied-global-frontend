import { EndNode } from "./nodes/EndNode";
import { StartNode } from "./nodes/StartNode";
import { SubagentNode } from "./nodes/SubagentNode";
import { ToolCallNode } from "./nodes/ToolCallNode";
import { TransferNode } from "./nodes/TransferNode";

export const NODE_TYPES = {
  start: StartNode,
  subagent: SubagentNode,
  tool_call: ToolCallNode,
  transfer_to_number: TransferNode,
  agent_transfer: TransferNode,
  end: EndNode,
} as const;
