import type { NodeProps } from "@xyflow/react";
import { ArrowRightLeft, Phone } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { TransferNodeData } from "../../../types/workflow";

export function TransferNode({ id, data, selected }: NodeProps<TransferNodeData>) {
  const isPhone = data.nodeType === "transfer_to_number";

  return (
    <BaseNode
      id={id}
      selected={selected}
      color={isPhone ? "#10b981" : "#8b5cf6"}
      icon={isPhone ? <Phone size={14} /> : <ArrowRightLeft size={14} />}
      title={data.label}
      subtitle={isPhone ? data.phoneNumber || "No number set" : data.agentId || "No agent set"}
      hasOutputHandle={false}
    />
  );
}
