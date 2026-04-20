import type { Edge, Node } from "@xyflow/react";
import { START_NODE_ID } from "../types/workflow";
import type { WorkflowEdgeData, WorkflowNodeData } from "../types/workflow";

export interface WorkflowValidationIssue {
  nodeId?: string;
  message: string;
  severity: "error" | "warning";
}

export function validateWorkflow(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge<WorkflowEdgeData>[],
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];
  const nodeIds = new Set(nodes.map((node) => node.id));

  // Block: empty canvas (only start or zero nodes)
  if (nodes.length <= 1) {
    issues.push({
      message: "Workflow cannot be empty. Add at least one step after Start.",
      severity: "error",
    });
  }

  const startNodes = nodes.filter((node) => node.data.nodeType === "start");
  if (startNodes.length !== 1) {
    issues.push({
      message: "Workflow must contain exactly one Start node.",
      severity: "error",
    });
  }

  const endNodes = nodes.filter((node) => node.data.nodeType === "end");
  if (endNodes.length === 0) {
    issues.push({
      message: "Workflow must have at least one End node.",
      severity: "error",
    });
  }

  // Block: ambiguous start — any non-start node with no incoming edges (multiple entry points)
  // Count ALL edges: every edge gives its target an incoming connection (condition type does not affect graph structure)
  const incomingCount = new Map<string, number>();
  for (const edge of edges) {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
  }
  const nodesWithNoIncoming = nodes.filter(
    (n) => n.data.nodeType !== "start" && (incomingCount.get(n.id) ?? 0) === 0,
  );
  if (nodesWithNoIncoming.length > 0) {
    issues.push({
      message: `"${nodesWithNoIncoming[0].data.label}" has no incoming connection. All nodes must connect from Start or another node.`,
      severity: "error",
    });
  }

  const nodesWithOutgoing = new Set(edges.map((edge) => edge.source));
  if (startNodes.length === 1 && !nodesWithOutgoing.has(START_NODE_ID)) {
    issues.push({
      nodeId: START_NODE_ID,
      message: '"Start Call" must connect to the first step in the workflow.',
      severity: "error",
    });
  }

  const incomingToStart = edges.some((edge) => edge.target === START_NODE_ID);
  if (incomingToStart) {
    issues.push({
      nodeId: START_NODE_ID,
      message: '"Start Call" cannot have incoming connections.',
      severity: "error",
    });
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({
        message: `Edge "${edge.id}" points to a missing node.`,
        severity: "error",
      });
    }
  }

  /** Terminal / sink nodes must not require a next step; only these may warn when missing outgoing edges. */
  const nodeTypesThatRequireOutgoing = new Set<
    WorkflowNodeData["nodeType"]
  >(["subagent", "tool_call", "start"]);

  for (const node of nodes) {
    if (
      nodeTypesThatRequireOutgoing.has(node.data.nodeType) &&
      !nodesWithOutgoing.has(node.id)
    ) {
      issues.push({
        nodeId: node.id,
        message: `"${node.data.label}" has no outgoing connection.`,
        severity: "warning",
      });
    }
  }

  const reachable = new Set<string>();
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
  }

  const queue = startNodes.length === 1 ? [START_NODE_ID] : [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    for (const target of adjacency.get(current) ?? []) {
      if (!reachable.has(target)) queue.push(target);
    }
  }

  for (const node of nodes) {
    if (
      node.data.nodeType !== "start" &&
      startNodes.length === 1 &&
      !reachable.has(node.id)
    ) {
      issues.push({
        nodeId: node.id,
        message: `"${node.data.label}" is not connected to the Start node.`,
        severity: "warning",
      });
    }
  }

  // Forward adjacency: all edges are forward-traversable (unconditional = always, llm/expression = when condition met)
  const forwardAdjacency = new Map<string, string[]>();
  for (const edge of edges) {
    forwardAdjacency.set(edge.source, [
      ...(forwardAdjacency.get(edge.source) ?? []),
      edge.target,
    ]);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  let hasForwardCycle = false;

  function visit(nodeId: string) {
    if (hasForwardCycle) return;
    visited.add(nodeId);
    inStack.add(nodeId);

    for (const nextId of forwardAdjacency.get(nodeId) ?? []) {
      if (!visited.has(nextId)) {
        visit(nextId);
      } else if (inStack.has(nextId)) {
        hasForwardCycle = true;
        return;
      }
    }

    inStack.delete(nodeId);
  }

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      visit(nodeId);
    }
  }

  if (hasForwardCycle) {
    issues.push({
      message:
        "Cycle detected in forward edges. Mark looping branches as backward edges.",
      severity: "warning",
    });
  }

  for (const node of nodes) {
    if (
      node.data.nodeType === "subagent" &&
      !node.data.systemPrompt.trim()
    ) {
      issues.push({
        nodeId: node.id,
        message: `"${node.data.label}" has no system prompt.`,
        severity: "warning",
      });
    }
  }

  for (const node of nodes) {
    if (node.data.nodeType === "tool_call" && !node.data.toolId) {
      issues.push({
        nodeId: node.id,
        message: `"${node.data.label}" has no tool selected.`,
        severity: "error",
      });
    }
  }

  // Warn: Transfer to Number with no phone number
  for (const node of nodes) {
    if (
      node.data.nodeType === "transfer_to_number" &&
      !(node.data.phoneNumber?.trim?.() ?? "")
    ) {
      issues.push({
        nodeId: node.id,
        message: `"${node.data.label}" has no phone number set.`,
        severity: "warning",
      });
    }
  }

  // Warn: Agent Transfer with no target agent
  for (const node of nodes) {
    if (
      node.data.nodeType === "agent_transfer" &&
      !(node.data.agentId?.trim?.() ?? "")
    ) {
      issues.push({
        nodeId: node.id,
        message: `"${node.data.label}" has no target agent set.`,
        severity: "warning",
      });
    }
  }

  // Warn: LLM-type edge with empty condition string (forward or backward)
  for (const edge of edges) {
    const forwardLlmEmpty =
      edge.data?.forwardConditionType === "llm" &&
      !(edge.data?.forwardCondition?.trim?.() ?? "");
    const backwardLlmEmpty =
      edge.data?.backwardConditionType === "llm" &&
      !(edge.data?.backwardCondition?.trim?.() ?? "");
    if (forwardLlmEmpty || backwardLlmEmpty) {
      issues.push({
        message: `Edge "${edge.id}" has an empty LLM condition.`,
        severity: "warning",
      });
    }
  }

  return issues;
}
