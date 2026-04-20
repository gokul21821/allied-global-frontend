import { useCallback, useState } from "react";
import type { User } from "firebase/auth";

interface VoiceLabels {
  accent?: string;
  description?: string;
  age?: string;
  gender?: string;
  use_case?: string;
  [key: string]: string | undefined;
}

export interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  labels?: VoiceLabels;
}

export interface KnowledgeBaseDocument {
  id: string;
  name: string;
  type: "file" | "url";
  extracted_inner_html: string;
}

export interface ToolSummary {
  tool_id: string;
  name: string;
}

interface UseAgentLoadArgs {
  backendUrl: string;
  effectiveUser: User | null;
  authUser: User | null;
  agentId?: string;
}

export function useAgentLoad({
  backendUrl,
  effectiveUser,
  authUser,
  agentId,
}: UseAgentLoadArgs) {
  const [agent, setAgent] = useState<any | null>(null);
  const [voice, setVoice] = useState<Voice | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseDocument[]>(
    [],
  );
  const [tools, setTools] = useState<ToolSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [loadingKnowledgeBase, setLoadingKnowledgeBase] = useState(false);
  const [error, setError] = useState("");

  const normalizeTools = useCallback(
    (
      payload: unknown,
    ): ToolSummary[] => {
      const toolsData = payload as {
        tools?: Array<{
          tool_id?: string;
          id?: string;
          name?: string;
          tool_config?: { name?: string };
        }>;
      };
      if (!Array.isArray(toolsData.tools)) return [];

      return toolsData.tools
        .map((t) => {
          const toolId =
            typeof t?.tool_id === "string"
              ? t.tool_id
              : typeof t?.id === "string"
                ? t.id
                : null;
          if (!toolId) return null;
          const toolName =
            typeof t.name === "string"
              ? t.name
              : typeof t?.tool_config?.name === "string"
                ? t.tool_config.name
                : toolId;
          return { tool_id: toolId, name: toolName };
        })
        .filter((t): t is ToolSummary => t !== null);
    },
    [],
  );

  const refreshTools = useCallback(async () => {
    if (!effectiveUser) {
      setTools([]);
      return;
    }
    try {
      const token = await authUser?.getIdToken();
      const toolsResponse = await fetch(`${backendUrl}/tools/${effectiveUser.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!toolsResponse.ok) {
        setTools([]);
        return;
      }
      const toolsPayload = await toolsResponse.json();
      setTools(normalizeTools(toolsPayload));
    } catch {
      setTools([]);
    }
  }, [authUser, backendUrl, effectiveUser, normalizeTools]);

  const fetchAgentDetails = useCallback(async () => {
    if (!effectiveUser || !agentId) return;

    try {
      setLoading(true);
      setError("");

      const token = await authUser?.getIdToken();

      const response = await fetch(
        `${backendUrl}/agents/${effectiveUser.uid}/${agentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch agent details");
      }

      const agentData = await response.json();
      setAgent(agentData);

      setLoadingVoices(true);
      const [voiceResponse, voicesResponse, kbResponse, toolsResponse] =
        await Promise.all([
          fetch(`${backendUrl}/voices/get-voice/${agentData.conversation_config.tts.voice_id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${backendUrl}/voices/list-voices`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${backendUrl}/knowledge-base/${effectiveUser.uid}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${backendUrl}/tools/${effectiveUser.uid}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      if (voiceResponse.ok) {
        const voiceData: Voice = await voiceResponse.json();
        setVoice(voiceData);
      } else {
        setVoice(null);
      }

      if (voicesResponse.ok) {
        const voicesData = await voicesResponse.json();
        if (Array.isArray(voicesData.voices)) {
          setVoices(voicesData.voices);
        } else {
          setVoices([]);
        }
      } else {
        setVoices([]);
      }

      setLoadingKnowledgeBase(true);
      if (kbResponse.ok) {
        const kbData = await kbResponse.json();
        setKnowledgeBase(kbData.documents || []);
      } else {
        setKnowledgeBase([]);
      }

      if (toolsResponse.ok) {
        const toolsPayload = await toolsResponse.json();
        setTools(normalizeTools(toolsPayload));
      } else {
        setTools([]);
      }
    } catch (err) {
      console.error("Error fetching agent details:", err);
      setError("Failed to load agent details. Please try again.");
    } finally {
      setLoading(false);
      setLoadingVoices(false);
      setLoadingKnowledgeBase(false);
    }
  }, [authUser, agentId, backendUrl, effectiveUser, normalizeTools]);

  return {
    agent,
    voice,
    setVoice,
    voices,
    knowledgeBase,
    tools,
    loading,
    loadingVoices,
    loadingKnowledgeBase,
    error,
    setError,
    fetchAgentDetails,
    refreshTools,
  };
}
