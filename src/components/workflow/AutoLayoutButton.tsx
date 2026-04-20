import { useReactFlow } from "@xyflow/react";
import { LayoutGrid } from "lucide-react";
import { deserializeWorkflow } from "../../lib/workflowDeserializer";
import { serializeWorkflow } from "../../lib/workflowSerializer";
import { useWorkflowStore } from "../../store/workflowStore";

export function AutoLayoutButton() {
  const { fitView } = useReactFlow();
  const { nodes, edges, setNodes } = useWorkflowStore();

  function handleLayout() {
    if (nodes.length === 0) return;

    const workflow = serializeWorkflow(nodes, edges);
    const { nodes: laidOutNodes } = deserializeWorkflow(workflow);

    const merged = nodes.map((node) => ({
      ...node,
      position:
        laidOutNodes.find((laidOutNode) => laidOutNode.id === node.id)
          ?.position ?? node.position,
    }));

    setNodes(merged);
    setTimeout(() => fitView({ padding: 0.2, duration: 450 }), 50);
  }

  return (
    <button
      onClick={handleLayout}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-100 hover:bg-gray-50 dark:hover:bg-dark-100 text-gray-600 dark:text-gray-400 shadow-sm transition-all"
      title="Auto-arrange nodes"
      type="button"
    >
      <LayoutGrid size={13} />
      Auto Layout
    </button>
  );
}
