import type { NodeProps } from "@xyflow/react";
import { Brain } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { SubagentNodeData } from "../../../types/workflow";

export function SubagentNode({ id, data, selected }: NodeProps<SubagentNodeData>) {
  const preview =
    data.systemPrompt.length > 60
      ? `${data.systemPrompt.slice(0, 60)}...`
      : data.systemPrompt;

  return (
    <BaseNode
      id={id}
      selected={selected}
      color="#65a30d"
      icon={<Brain size={14} />}
      title={data.label}
      subtitle={preview || "No prompt set"}
    />
  );
}
