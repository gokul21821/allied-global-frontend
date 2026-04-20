import type { NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { ToolCallNodeData } from "../../../types/workflow";

export function ToolCallNode({ id, data, selected }: NodeProps<ToolCallNodeData>) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      color="#f59e0b"
      icon={<Zap size={14} />}
      title={data.label}
      subtitle={data.toolId || "No tool selected"}
      hasSuccessHandle
      hasFailureHandle
      hasOutputHandle={false}
    />
  );
}
