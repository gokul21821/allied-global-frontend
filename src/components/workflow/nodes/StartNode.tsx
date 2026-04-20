import type { NodeProps } from "@xyflow/react";
import { PhoneCall } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { StartNodeData } from "../../../types/workflow";

export function StartNode({ id, data, selected }: NodeProps<StartNodeData>) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      color="#0f766e"
      icon={<PhoneCall size={14} />}
      title={data.label || "Start Call"}
      subtitle="Entry point for the workflow"
      hasInputHandle={false}
      deletable={false}
    />
  );
}
