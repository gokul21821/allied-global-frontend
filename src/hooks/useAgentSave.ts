import { useCallback } from "react";
import type { User } from "firebase/auth";

interface UseAgentSaveArgs {
  backendUrl: string;
  effectiveUser: User | null;
  authUser: User | null;
  agentId?: string;
}

export function useAgentSave({
  backendUrl,
  effectiveUser,
  authUser,
  agentId,
}: UseAgentSaveArgs) {
  const saveAgent = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!effectiveUser || !agentId) {
        throw new Error("Missing user or agent id");
      }
      const response = await fetch(
        `${backendUrl}/agents/${effectiveUser.uid}/${agentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await authUser?.getIdToken()}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: { detail?: Array<{ msg?: string }> };
        };

        let message = errorData.error || "Failed to update agent";

        if (errorData.details?.detail?.length) {
          const firstDetail = errorData.details.detail[0];
          if (firstDetail?.msg) {
            message = firstDetail.msg.replace(/^Value error,\s*/i, "");
          }
        }

        throw new Error(message);
      }
    },
    [agentId, authUser, backendUrl, effectiveUser],
  );

  return { saveAgent };
}
