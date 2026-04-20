import type { NodeProps } from "@xyflow/react";
import { CircleOff } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { EndNodeData } from "../../../types/workflow";

export function EndNode({ id, data, selected }: NodeProps<EndNodeData>) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      color="#6b7280"
      icon={<CircleOff size={14} />}
      title={data.label || "End"}
      subtitle="Conversation ends here"
      hasOutputHandle={false}
    />
  );
}
