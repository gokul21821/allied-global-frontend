import { useCallback, useEffect, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AutoLayoutButton } from "./AutoLayoutButton";
import { TemplatesButton } from "./TemplatesButton";
import { NODE_TYPES } from "./nodeTypes";
import { EDGE_TYPES } from "./WorkflowEdge";
import { useWorkflowStore } from "../../store/workflowStore";
import { useThemeStore } from "../../lib/store";
import type { WorkflowEdgeData } from "../../types/workflow";

interface WorkflowCanvasProps {
  tools: { tool_id: string; name: string }[];
  voices: { voice_id: string; name: string }[];
  knowledgeDocs: { id: string; name: string; type: string }[];
}

function Canvas(_props: WorkflowCanvasProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setSelectedNodeId,
    setSelectedEdgeId,
  } = useWorkflowStore();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const [connectHint, setConnectHint] = useState<string | null>(null);

  useEffect(() => {
    if (!connectHint) return;
    const t = window.setTimeout(() => setConnectHint(null), 4500);
    return () => window.clearTimeout(t);
  }, [connectHint]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      const { edges: currentEdges, addWorkflowEdge: addEdge } =
        useWorkflowStore.getState();

      const duplicateEdge = currentEdges.some(
        (e) => e.source === connection.source && e.target === connection.target,
      );
      if (duplicateEdge) return;

      const hasUnconditionalOutgoing = currentEdges.some(
        (e) =>
          e.source === connection.source &&
          e.data?.forwardConditionType === "none",
      );
      if (hasUnconditionalOutgoing) {
        const msg =
          "This node already has an unconditional edge — change it to a conditional edge first before adding another.";
        console.warn(msg);
        setConnectHint(msg);
        return;
      }

      addEdge({
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        ...connection,
        type: "workflowEdge",
        data: {
          forwardConditionType: "none",
          forwardCondition: "",
          forwardLabel: "",
          backwardConditionType: "none",
          backwardCondition: "",
          backwardLabel: "",
        },
      });
    },
    [],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge<WorkflowEdgeData>, newConnection: Connection) => {
      if (!newConnection.source || !newConnection.target) return;
      if (newConnection.source === newConnection.target) return;
      const { edges, setEdges } = useWorkflowStore.getState();
      setEdges(reconnectEdge(oldEdge, newConnection, edges));
    },
    [],
  );

  return (
    <div className="flex h-full w-full">
      {/* NodePalette commented out - user adds nodes via plus button only */}
      {/* <NodePalette /> */}

      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          edgesReconnectable
          onReconnect={onReconnect}
          nodeTypes={NODE_TYPES as any}
          edgeTypes={EDGE_TYPES as any}
          defaultEdgeOptions={{ type: "workflowEdge" }}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{
            stroke: isDarkMode ? "#64748b" : "#94a3b8",
            strokeWidth: 2,
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
          onEdgeClick={(_event, edge) => setSelectedEdgeId(edge.id)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode="Backspace"
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={isDarkMode ? "#3f3f46" : "#e2e8f0"}
          />
          <Controls className="!shadow-sm !border !border-gray-200 dark:!border-dark-100 !rounded-xl !bg-white dark:!bg-dark-200" />
          <MiniMap
            className="!border !border-gray-200 dark:!border-dark-100 !rounded-xl !shadow-sm !bg-white dark:!bg-dark-200"
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                start: "#0f766e",
                subagent: "#65a30d",
                tool_call: "#f59e0b",
                end: "#6b7280",
                transfer_to_number: "#10b981",
                agent_transfer: "#8b5cf6",
              };
              return colors[node.type ?? ""] ?? "#94a3b8";
            }}
          />
          <Panel position="top-right">
            <div className="flex gap-2">
              <TemplatesButton />
              <AutoLayoutButton />
            </div>
          </Panel>
        </ReactFlow>
        {connectHint ? (
          <div
            role="status"
            className="pointer-events-none absolute bottom-4 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 shadow-md dark:border-amber-800/80 dark:bg-amber-950/90 dark:text-amber-100"
          >
            {connectHint}
          </div>
        ) : null}
      </div>

      {/* NodeConfigPanel and EdgeConfigPanel rendered in parent (AgentDetails) right sidebar */}
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
