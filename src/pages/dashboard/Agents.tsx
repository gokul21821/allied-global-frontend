import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Trash2,
  X,
  Loader2,
  ArrowRight,
  Database,
  Speech,
  Copy,
  MoreVertical,
  Download,
  Upload, // ADD THIS
  FileJson, // ADD THIS
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { AudioPlayer } from "../../components/AudioPlayer";
import { KnowledgeBaseSelect } from "../../components/KnowledgeBaseSelect";
import { cn } from "../../lib/utils";
import {
  getModelId,
  getAvailableModels,
  llmOptions,
  languages,
} from "../../lib/constants";

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
}

interface CreateAgentPayload {
  user_id: string;
  conversation_config: {
    tts: {
      voice_id: string;
      model_id: string;
    };
    turn: Record<string, never>;
    agent: {
      prompt: {
        prompt: string;
        llm: string;
        temperature: number;
        knowledge_base: {
          id: string;
          name: string;
          type: string;
        }[];
        tool_ids: string[];
      };
      language: string;
    };
  };
  name: string;
}

interface AgentPrompt {
  prompt: string;
  llm: string;
  temperature: number;
  knowledge_base_document_ids?: string[];
}

interface Agent {
  agent_id: string;
  name: string;
  created_at_unix_secs: number;
  access_level: string;
  conversation_config?: {
    agent?: {
      prompt?: AgentPrompt;
      language?: string;
    };
    tts?: {
      voice_id: string;
      model_id: string;
    };
  };
}

interface AgentListResponse {
  agents: Agent[];
  has_more: boolean;
  next_cursor: string | null;
}

interface KnowledgeBaseDocument {
  id: string;
  name: string;
  type: "file" | "url";
  extracted_inner_html: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const agentIcons = [{ icon: Speech, color: "primary" }];

const getAgentIcon = (agentId: string) => {
  const index =
    Math.abs(
      agentId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
    ) % agentIcons.length;
  return agentIcons[index];
};

const Agents = () => {
  const { getEffectiveUser } = useAuth();
  const user = getEffectiveUser();
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseDocument[]>(
    [],
  );
  const [loadingKnowledgeBase, setLoadingKnowledgeBase] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false); // ADD THIS
  const [isImporting, setIsImporting] = useState(false); // ADD THIS
  const [importError, setImportError] = useState(""); // ADD THIS
  const [importSuccess, setImportSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    prompt: "",
    llm: "gpt-4o",
    temperature: 0.7,
    voiceId: "",
    language: "en",
    modelType: "turbo",
  });
  const [nameError, setNameError] = useState("");

  const handleDeleteAgent = async (agentId: string) => {
    if (!user || !window.confirm("Are you sure you want to delete this agent?"))
      return;

    try {
      setOpenMenuId(null);
      const response = await fetch(
        `${BACKEND_URL}/agents/${user.uid}/${agentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }

      await fetchAgents();
    } catch (error) {
      console.error("Error deleting agent:", error);
      alert("Failed to delete agent. Please try again.");
    }
  };

  const handleDuplicateAgent = async (agent: Agent) => {
    if (!user) return;

    try {
      setIsDuplicating(agent.agent_id);
      setOpenMenuId(null);

      // First, fetch the complete agent details to get all configuration
      const detailResponse = await fetch(
        `${BACKEND_URL}/agents/${user.uid}/${agent.agent_id}`,
        {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        },
      );

      if (!detailResponse.ok) {
        throw new Error("Failed to fetch agent details");
      }

      const agentDetails = await detailResponse.json();

      // Extract knowledge base from the agent's prompt
      const knowledgeBaseArray =
        agentDetails.conversation_config?.agent?.prompt?.knowledge_base || [];

      // Get model type from model_id
      const modelId = agentDetails.conversation_config?.tts?.model_id || "";
      let modelType = "turbo";
      if (modelId.includes("flash")) {
        modelType = "flash";
      } else if (modelId.includes("turbo_v2_5")) {
        modelType = "turbo_v2_5";
      } else if (modelId.includes("turbo_v2")) {
        modelType = "turbo_v2";
      }

      const language =
        agentDetails.conversation_config?.agent?.language || "en";

      const payload: CreateAgentPayload = {
        user_id: user.uid,
        conversation_config: {
          tts: {
            voice_id: agentDetails.conversation_config?.tts?.voice_id || "",
            model_id:
              agentDetails.conversation_config?.tts?.model_id ||
              getModelId(modelType, language),
          },
          turn: {},
          agent: {
            prompt: {
              prompt:
                agentDetails.conversation_config?.agent?.prompt?.prompt || "",
              llm:
                agentDetails.conversation_config?.agent?.prompt?.llm ||
                "gpt-4o",
              temperature:
                agentDetails.conversation_config?.agent?.prompt?.temperature ??
                0.7,
              knowledge_base: knowledgeBaseArray,
              tool_ids:
                agentDetails.conversation_config?.agent?.prompt?.tool_ids || [],
            },
            language: language,
          },
        },
        name: `Duplicate - ${agent.name}`,
      };

      const response = await fetch(
        `${BACKEND_URL}/agents/create?use_tool_ids=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error:", errorData);
        throw new Error(
          `Failed to duplicate agent: ${errorData.message || response.statusText}`,
        );
      }

      await fetchAgents();
    } catch (error) {
      console.error("Error duplicating agent:", error);
      alert(
        `Failed to duplicate agent: ${error instanceof Error ? error.message : "Please try again."}`,
      );
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleExportAgent = async (agent: Agent, format: "json" | "csv") => {
    if (!user) return;

    try {
      setOpenMenuId(null);

      // Fetch complete agent details
      const detailResponse = await fetch(
        `${BACKEND_URL}/agents/${user.uid}/${agent.agent_id}`,
        {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        },
      );

      if (!detailResponse.ok) {
        throw new Error("Failed to fetch agent details");
      }

      const agentDetails = await detailResponse.json();

      // Format timestamp properly - check if it's already in milliseconds or seconds
      const timestamp = agentDetails.created_at_unix_secs;
      const timestampMs =
        timestamp > 10000000000 ? timestamp : timestamp * 1000;
      const formattedDate = new Date(timestampMs).toLocaleString();

      // Get voice name from voices list
      const voiceName =
        voices.find(
          (v) => v.voice_id === agentDetails.conversation_config?.tts?.voice_id,
        )?.name ||
        agentDetails.conversation_config?.tts?.voice_id ||
        "N/A";

      // Get knowledge base documents info
      const knowledgeBaseDocs =
        agentDetails.conversation_config?.agent?.prompt?.knowledge_base || [];
      const kbNames =
        knowledgeBaseDocs.map((kb: any) => kb.name).join(", ") || "None";

      if (format === "json") {
        // Export complete agent data as JSON
        const jsonString = JSON.stringify(agentDetails, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `agent-${agent.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Export as CSV with all visible data
        const csvRows = [
          ["Field", "Value"],
          ["Agent ID", agentDetails.agent_id],
          ["Name", agentDetails.name],
          ["Created At", formattedDate],
          ["Access Level", agentDetails.access_level],
          [
            "Language",
            agentDetails.conversation_config?.agent?.language || "en",
          ],
          [
            "LLM Model",
            agentDetails.conversation_config?.agent?.prompt?.llm || "N/A",
          ],
          [
            "Temperature",
            (
              agentDetails.conversation_config?.agent?.prompt?.temperature ??
              0.7
            ).toString(),
          ],
          ["Voice", voiceName],
          [
            "Voice ID",
            agentDetails.conversation_config?.tts?.voice_id || "N/A",
          ],
          [
            "Voice Model ID",
            agentDetails.conversation_config?.tts?.model_id || "N/A",
          ],
          ["Knowledge Base Documents", kbNames],
          [
            "Prompt",
            `"${(agentDetails.conversation_config?.agent?.prompt?.prompt || "").replace(/"/g, '""')}"`,
          ],
        ];

        const csvContent = csvRows.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `agent-${agent.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting agent:", error);
      alert(
        `Failed to export agent: ${error instanceof Error ? error.message : "Please try again."}`,
      );
    }
  };

  const handleExportAllAgents = async (format: "json" | "csv") => {
    if (!user || agents.length === 0) return;

    try {
      setIsExporting(true);
      setIsExportDialogOpen(false);

      // ✅ Get token once before mapping
      const token = await user.getIdToken();

      // Fetch all agent details
      const agentDetailsPromises = agents.map((agent) =>
        fetch(`${BACKEND_URL}/agents/${user.uid}/${agent.agent_id}`, {
          headers: {
            Authorization: token,
          },
        }).then((res) => res.json()),
      );

      const allAgentDetails = await Promise.all(agentDetailsPromises);

      if (format === "json") {
        // Export all agents as a single JSON file
        const jsonString = JSON.stringify(
          {
            agents: allAgentDetails,
            exported_at: new Date().toISOString(),
            total_count: allAgentDetails.length,
          },
          null,
          2,
        );
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `all-agents-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Export all agents as CSV
        const csvRows = [
          [
            "Agent ID",
            "Name",
            "Created At",
            "Access Level",
            "Language",
            "LLM Model",
            "Temperature",
            "Voice ID",
            "Voice Model ID",
            "Knowledge Base Documents",
            "Prompt",
          ],
        ];

        allAgentDetails.forEach((agentDetails) => {
          const timestamp = agentDetails.created_at_unix_secs;
          const timestampMs =
            timestamp > 10000000000 ? timestamp : timestamp * 1000;
          const formattedDate = new Date(timestampMs).toLocaleString();

          const knowledgeBaseDocs =
            agentDetails.conversation_config?.agent?.prompt?.knowledge_base ||
            [];
          const kbNames =
            knowledgeBaseDocs.map((kb: any) => kb.name).join("; ") || "None";

          csvRows.push([
            agentDetails.agent_id,
            `"${agentDetails.name.replace(/"/g, '""')}"`,
            formattedDate,
            agentDetails.access_level,
            agentDetails.conversation_config?.agent?.language || "en",
            agentDetails.conversation_config?.agent?.prompt?.llm || "N/A",
            (
              agentDetails.conversation_config?.agent?.prompt?.temperature ??
              0.7
            ).toString(),
            agentDetails.conversation_config?.tts?.voice_id || "N/A",
            agentDetails.conversation_config?.tts?.model_id || "N/A",
            `"${kbNames.replace(/"/g, '""')}"`,
            `"${(agentDetails.conversation_config?.agent?.prompt?.prompt || "").replace(/"/g, '""')}"`,
          ]);
        });

        const csvContent = csvRows.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `all-agents-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting all agents:", error);
      alert(
        `Failed to export agents: ${error instanceof Error ? error.message : "Please try again."}`,
      );
    } finally {
      setIsExporting(false);
    }
  };
  const handleDownloadSample = (format: "json" | "csv") => {
    if (format === "json") {
      const sampleData = {
        name: "Sample Agent",
        conversation_config: {
          tts: {
            voice_id: "your_voice_id_here",
            model_id: "eleven_turbo_v2_5",
          },
          agent: {
            prompt: {
              prompt: "You are a helpful AI assistant.",
              llm: "gpt-4o",
              temperature: 0.7,
              knowledge_base: [],
              tool_ids: [],
            },
            language: "en",
          },
        },
      };

      const jsonString = JSON.stringify(sampleData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sample-agent.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const csvContent = `Name,Prompt,LLM Model,Temperature,Voice ID,Voice Model ID,Language
Sample Agent,"You are a helpful AI assistant.",gpt-4o,0.7,your_voice_id_here,eleven_turbo_v2_5,en`;

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sample-agent.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let currentValue = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(currentValue);
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);
    return values.map((v) => v.trim());
  };

  const handleImportAgents = async (file: File, format: "json" | "csv") => {
    if (!user) return;

    try {
      setIsImporting(true);
      setImportError("");
      setImportSuccess("");

      const fileContent = await file.text();
      let agentsToImport: any[] = [];

      if (format === "json") {
        try {
          const jsonData = JSON.parse(fileContent);

          if (Array.isArray(jsonData)) {
            agentsToImport = jsonData;
          } else if (jsonData.agents && Array.isArray(jsonData.agents)) {
            agentsToImport = jsonData.agents;
          } else if (jsonData.name && jsonData.conversation_config) {
            agentsToImport = [jsonData];
          } else {
            throw new Error(
              "Invalid JSON format. Please use the sample file as a reference.",
            );
          }
        } catch (parseError) {
          throw new Error("Invalid JSON file. Please check the file format.");
        }
      } else {
        const lines = fileContent.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          throw new Error("CSV file is empty or missing data rows.");
        }

        const headers = parseCSVLine(lines[0]).map((h) => h.trim());

        const requiredHeaders = [
          "name",
          "prompt",
          "llm model",
          "temperature",
          "voice id",
          "voice model id",
          "language",
        ];
        const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
        const hasValidHeaders = requiredHeaders.every((h) =>
          normalizedHeaders.includes(h),
        );

        if (!hasValidHeaders) {
          throw new Error(
            `Invalid CSV format. Required headers: ${requiredHeaders.join(", ")}`,
          );
        }

        // Create header index map
        const headerMap: { [key: string]: number } = {};
        requiredHeaders.forEach((reqHeader) => {
          const index = normalizedHeaders.indexOf(reqHeader);
          headerMap[reqHeader] = index;
        });
        const missingHeaders = requiredHeaders.filter(
          (h) => headerMap[h] === -1,
        );
        if (missingHeaders.length > 0) {
          throw new Error(
            `Missing required headers: ${missingHeaders.join(", ")}. Required headers: ${requiredHeaders.join(", ")}`,
          );
        }
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = parseCSVLine(lines[i]).map((v) => v.trim());

          if (values.length < requiredHeaders.length) {
            console.warn(
              `Skipping row ${i + 1}: insufficient columns (has ${values.length}, needs ${requiredHeaders.length})`,
            );
            continue;
          }
          const agent = {
            name: values[headerMap["name"]] || `Imported Agent ${i}`,
            conversation_config: {
              tts: {
                voice_id: values[headerMap["voice id"]] || "",
                model_id:
                  values[headerMap["voice model id"]] || "eleven_turbo_v2_5",
              },
              agent: {
                prompt: {
                  prompt:
                    values[headerMap["prompt"]]
                      .replace(/^"|"$/g, "")
                      .replace(/""/g, '"') || "",
                  llm: values[headerMap["llm model"]] || "gpt-4o",
                  temperature:
                    parseFloat(values[headerMap["temperature"]]) || 0.7,
                  knowledge_base: [],
                  tool_ids: [],
                },
                language: values[headerMap["language"]] || "en",
              },
            },
          };

          agentsToImport.push(agent);
        }

        if (agentsToImport.length === 0) {
          throw new Error("No valid agents found in CSV file.");
        }
      }

      let successCount = 0;
      let failCount = 0;
      const token = await user.getIdToken();

      for (const agentData of agentsToImport) {
        try {
          if (!agentData.name || !agentData.conversation_config) {
            console.warn("Skipping invalid agent:", agentData);
            failCount++;
            continue;
          }

          const payload: CreateAgentPayload = {
            user_id: user.uid,
            conversation_config: {
              tts: {
                voice_id: agentData.conversation_config?.tts?.voice_id || "",
                model_id:
                  agentData.conversation_config?.tts?.model_id ||
                  "eleven_turbo_v2_5",
              },
              turn: {},
              agent: {
                prompt: {
                  prompt:
                    agentData.conversation_config?.agent?.prompt?.prompt || "",
                  llm:
                    agentData.conversation_config?.agent?.prompt?.llm ||
                    "gpt-4o",
                  temperature:
                    agentData.conversation_config?.agent?.prompt?.temperature ??
                    0.7,
                  knowledge_base:
                    agentData.conversation_config?.agent?.prompt
                      ?.knowledge_base || [],
                  tool_ids:
                    agentData.conversation_config?.agent?.prompt?.tool_ids ||
                    [],
                },
                language:
                  agentData.conversation_config?.agent?.language || "en",
              },
            },
            name: `${agentData.name}`,
          };

          const response = await fetch(
            `${BACKEND_URL}/agents/create?use_tool_ids=true`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            },
          );

          if (response.ok) {
            successCount++;
          } else {
            console.error(`Failed to import agent: ${agentData.name}`);
            failCount++;
          }
        } catch (error) {
          console.error(`Error importing agent ${agentData.name}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        await fetchAgents();
        setImportSuccess(
          `Successfully imported ${successCount} agent${successCount !== 1 ? "s" : ""}${failCount > 0 ? `. ${failCount} failed.` : "."}`,
        );

        setTimeout(() => {
          setIsImportDialogOpen(false);
          setImportSuccess("");
        }, 2000);
      } else {
        setImportError(
          `Failed to import agents. Please check the file format.`,
        );
      }
    } catch (error) {
      console.error("Error importing agents:", error);
      setImportError(
        error instanceof Error
          ? error.message
          : "Failed to import agents. Please try again.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    format: "json" | "csv",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (format === "json" && fileExtension !== "json") {
      setImportError("Please upload a JSON file");
      return;
    }
    if (format === "csv" && fileExtension !== "csv") {
      setImportError("Please upload a CSV file");
      return;
    }

    handleImportAgents(file, format);
    event.target.value = "";
  };

  useEffect(() => {
    const fetchVoices = async () => {
      if (!isCreating) return;

      try {
        setLoadingVoices(true);
        const response = await fetch(`${BACKEND_URL}/voices/list-voices`, {
          headers: {
            Authorization: `Bearer ${await user?.getIdToken()}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch voices");
        }

        const data = await response.json();
        if (data.voices && Array.isArray(data.voices)) {
          setVoices(data.voices);
          if (data.voices.length > 0) {
            setFormData((prev) => ({
              ...prev,
              voiceId: data.voices[0].voice_id,
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching voices:", error);
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [isCreating, user]);

  const fetchAgents = async () => {
    if (!user) return;

    try {
      setLoadingAgents(true);
      const response = await fetch(`${BACKEND_URL}/agents/${user.uid}`, {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch agents");
      }

      const data: AgentListResponse = await response.json();
      setAgents(data.agents || []);

      setLoadingKnowledgeBase(true);
      const kbResponse = await fetch(
        `${BACKEND_URL}/knowledge-base/${user.uid}`,
        {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        },
      );

      if (kbResponse.ok) {
        const kbData = await kbResponse.json();
        if (kbData.documents && Array.isArray(kbData.documents)) {
          setKnowledgeBase(kbData.documents);
        } else {
          setKnowledgeBase([]);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingAgents(false);
      setLoadingKnowledgeBase(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [user]);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Update model type when language changes to ensure compatibility
  useEffect(() => {
    const availableModels = getAvailableModels(formData.language);
    const isCurrentModelAvailable = availableModels.some(
      (model) => model.id === formData.modelType,
    );

    if (!isCurrentModelAvailable && availableModels.length > 0) {
      setFormData({ ...formData, modelType: availableModels[0].id });
    }
  }, [formData.language]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate agent name
    if (!formData.name.trim()) {
      setNameError("Please enter a name for your agent");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const knowledgeBaseArray = selectedDocuments.map((docId) => {
        const doc = knowledgeBase.find((kb) => kb.id === docId);
        return {
          id: doc!.id,
          name: doc!.name,
          type: doc!.type,
        };
      });

      const payload: CreateAgentPayload = {
        user_id: user.uid,
        conversation_config: {
          tts: {
            voice_id: formData.voiceId,
            model_id: getModelId(formData.modelType, formData.language),
          },
          turn: {},
          agent: {
            prompt: {
              prompt: formData.prompt,
              llm: formData.llm,
              temperature: formData.temperature,
              knowledge_base: knowledgeBaseArray,
              tool_ids: [],
            },
            language: formData.language,
          },
        },
        name: formData.name,
      };

      const response = await fetch(
        `${BACKEND_URL}/agents/create?use_tool_ids=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to create agent");
      }

      setIsCreating(false);
      setFormData({
        name: "",
        prompt: "",
        llm: "gpt-4o",
        temperature: 0.7,
        voiceId: "",
        language: "en",
        modelType: "turbo",
      });
      setSelectedDocuments([]);

      await fetchAgents();
    } catch (error) {
      console.error("Error creating agent:", error);
      setError("Failed to create agent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            AI Agents
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and manage your AI agents
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-100 border border-transparent focus:bg-white dark:focus:bg-dark-200 focus:border-primary/20 dark:focus:border-primary-400/20 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 shadow-sm transition-all w-64"
            />
          </div>
          <button
            onClick={() => setIsExportDialogOpen(true)}
            className="btn btn-secondary"
            disabled={agents.length === 0 || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </button>
          <button
            onClick={() => setIsImportDialogOpen(true)}
            className="btn btn-secondary"
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </button>
        </div>
      </div>

      {/* Export All Dialog */}
      <AnimatePresence>
        {isExportDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setIsExportDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-100">
                <div className="flex items-center space-x-2">
                  <Download className="w-6 h-6 text-primary dark:text-primary-400" />
                  <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                    Export All Agents
                  </h2>
                </div>
                <button
                  onClick={() => setIsExportDialogOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Export all {agents.length} agent
                  {agents.length !== 1 ? "s" : ""} in your preferred format
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleExportAllAgents("json")}
                    className="p-6 rounded-xl border-2 border-gray-200 dark:border-dark-100 hover:border-primary dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-400/10 transition-all text-center group"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                      <Download className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      JSON Format
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Complete data structure
                    </div>
                  </button>

                  <button
                    onClick={() => handleExportAllAgents("csv")}
                    className="p-6 rounded-xl border-2 border-gray-200 dark:border-dark-100 hover:border-primary dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-400/10 transition-all text-center group"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center">
                      <Download className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      CSV Format
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Spreadsheet compatible
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Import Dialog */}
      <AnimatePresence>
        {isImportDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => {
              if (!isImporting) {
                setIsImportDialogOpen(false);
                setImportError("");
                setImportSuccess("");
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-100">
                <div className="flex items-center space-x-2">
                  <Upload className="w-6 h-6 text-primary dark:text-primary-400" />
                  <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                    Import Agents
                  </h2>
                </div>
                <button
                  onClick={() => {
                    if (!isImporting) {
                      setIsImportDialogOpen(false);
                      setImportError("");
                      setImportSuccess("");
                    }
                  }}
                  disabled={isImporting}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Import agents from a JSON or CSV file. Download a sample file
                  to see the required format.
                </p>

                {importError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {importError}
                    </p>
                  </div>
                )}

                {importSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {importSuccess}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* JSON Import */}
                  <div className="space-y-3">
                    <label
                      htmlFor="json-upload"
                      className={cn(
                        "block p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-100 hover:border-primary dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-400/10 transition-all text-center cursor-pointer group",
                        isImporting &&
                          "opacity-50 cursor-not-allowed pointer-events-none",
                      )}
                    >
                      <input
                        id="json-upload"
                        type="file"
                        accept=".json"
                        onChange={(e) => handleFileUpload(e, "json")}
                        disabled={isImporting}
                        className="hidden"
                      />
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                        <FileJson className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        JSON Format
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Complete data structure
                      </div>
                      <div className="text-xs text-primary dark:text-primary-400 font-medium">
                        Click to upload
                      </div>
                    </label>
                    <button
                      onClick={() => handleDownloadSample("json")}
                      disabled={isImporting}
                      className="w-full text-xs text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-400 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Download Sample JSON
                    </button>
                  </div>

                  {/* CSV Import */}
                  <div className="space-y-3">
                    <label
                      htmlFor="csv-upload"
                      className={cn(
                        "block p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-100 hover:border-primary dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-400/10 transition-all text-center cursor-pointer group",
                        isImporting &&
                          "opacity-50 cursor-not-allowed pointer-events-none",
                      )}
                    >
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileUpload(e, "csv")}
                        disabled={isImporting}
                        className="hidden"
                      />
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        CSV Format
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Spreadsheet compatible
                      </div>
                      <div className="text-xs text-primary dark:text-primary-400 font-medium">
                        Click to upload
                      </div>
                    </label>
                    <button
                      onClick={() => handleDownloadSample("csv")}
                      disabled={isImporting}
                      className="w-full text-xs text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-400 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Download Sample CSV
                    </button>
                  </div>
                </div>

                {isImporting && (
                  <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing agents...</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-100">
                <div className="flex items-center space-x-2">
                  <Speech className="w-6 h-6 text-primary dark:text-primary-400" />
                  <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                    Create New Agent
                  </h2>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleCreateAgent}
                className="p-6 space-y-8 relative"
                noValidate
              >
                <div className="space-y-4">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Agent Name
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (e.target.value.trim()) {
                        setNameError("");
                      }
                    }}
                    placeholder="Enter a name for your agent"
                    className={cn(
                      "input",
                      nameError &&
                        "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500",
                    )}
                    required
                  />
                  {nameError && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                      {nameError}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="prompt"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Prompt
                  </label>
                  <textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) =>
                      setFormData({ ...formData, prompt: e.target.value })
                    }
                    placeholder="Enter the agent's behavior and instructions..."
                    rows={4}
                    className="input"
                    required
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Describe how your agent should behave and interact with
                    users.
                  </p>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="llm"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Language Model
                  </label>
                  <select
                    id="llm"
                    value={formData.llm}
                    onChange={(e) =>
                      setFormData({ ...formData, llm: e.target.value })
                    }
                    className="input"
                  >
                    {llmOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select the AI model that will power your agent.
                  </p>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="temperature"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Temperature ({formData.temperature})
                  </label>
                  <input
                    type="range"
                    id="temperature"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        temperature: parseFloat(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Adjust creativity level: 0 for focused responses, 1 for more
                    creative outputs.
                  </p>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="modelType"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Voice Model
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {getAvailableModels(formData.language).map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, modelType: model.id })
                        }
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.modelType === model.id
                            ? "border-primary bg-primary-50/50 dark:border-primary-400 dark:bg-primary-400/10"
                            : "border-gray-200 dark:border-dark-100 hover:border-primary/50 dark:hover:border-primary-400/50"
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {model.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {model.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="voiceId"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Voice
                  </label>
                  {loadingVoices ? (
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading available voices...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <select
                        id="voiceId"
                        value={formData.voiceId}
                        onChange={(e) =>
                          setFormData({ ...formData, voiceId: e.target.value })
                        }
                        className="input"
                        required
                      >
                        <option value="">Select a voice for your agent</option>
                        {voices.map((voice) => (
                          <option key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </option>
                        ))}
                      </select>
                      {formData.voiceId &&
                        voices.find((v) => v.voice_id === formData.voiceId)
                          ?.preview_url && (
                          <AudioPlayer
                            audioUrl={
                              voices.find(
                                (v) => v.voice_id === formData.voiceId,
                              )!.preview_url
                            }
                          />
                        )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Agent Language
                  </label>
                  <select
                    id="language"
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                    className="input"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose the default language the agent will communicate in.
                  </p>
                </div>

                <div className="space-y-4 pb-[300px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Knowledge Base
                  </label>
                  {loadingKnowledgeBase ? (
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading knowledge base...</span>
                    </div>
                  ) : knowledgeBase.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-dark-100 rounded-lg">
                      <Database className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No knowledge base documents found.
                      </p>
                      <Link
                        to="/dashboard/knowledge"
                        className="text-sm text-primary hover:text-primary-600 dark:hover:text-primary-400 mt-2 inline-block"
                      >
                        Add documents to knowledge base
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <KnowledgeBaseSelect
                        documents={knowledgeBase}
                        selectedDocuments={selectedDocuments}
                        onSelectionChange={setSelectedDocuments}
                      />
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-dark-200 py-4 border-t border-gray-200 dark:border-dark-100 mt-8">
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !formData.name.trim()}
                      className="btn btn-primary"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Agent"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
        {loadingAgents ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-primary-400" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Loading agents...
            </span>
          </div>
        ) : agents.length === 0 ? (
          <div className="p-8 text-center">
            <Speech className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
              No agents yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first AI agent to get started with automated
              conversations.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="btn btn-outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Agent
            </button>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
              No agents found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
              We couldn't find any agents matching "{searchQuery}". Try a
              different name.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="btn btn-secondary"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-dark-100">
            {filteredAgents.map((agent) => {
              const { icon: Icon, color } = getAgentIcon(agent.agent_id);
              const colorClasses = {
                primary: "from-primary/20 to-primary/10 text-primary",
                indigo: "from-indigo-500/20 to-indigo-500/10 text-indigo-500",
                rose: "from-rose-500/20 to-rose-500/10 text-rose-500",
                sky: "from-sky-500/20 to-sky-500/10 text-sky-500",
                amber: "from-amber-500/20 to-amber-500/10 text-amber-500",
                yellow: "from-yellow-500/20 to-yellow-500/10 text-yellow-500",
                purple: "from-purple-500/20 to-purple-500/10 text-purple-500",
                orange: "from-orange-500/20 to-orange-500/10 text-orange-500",
                emerald:
                  "from-emerald-500/20 to-emerald-500/10 text-emerald-500",
              };

              return (
                <Link
                  key={agent.agent_id}
                  to={`/dashboard/agents/${agent.agent_id}`}
                  className="block hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                              colorClasses[color]
                            } dark:from-opacity-30 dark:to-opacity-20 flex items-center justify-center`}
                          >
                            <Icon className="w-6 h-6 text-lime-500 dark:text-lime-500" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                            {agent.name}
                          </h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <p className="text-sm font-menu text-gray-500 dark:text-gray-400">
                              Created{" "}
                              {new Date(
                                agent.created_at_unix_secs * 1000,
                              ).toLocaleString()}
                            </p>
                            <div className="flex items-center space-x-1 text-xs font-menu"></div>
                            {agent.conversation_config?.tts?.voice_id && (
                              <div className="flex items-center space-x-1 text-xs font-menu">
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                <span className="text-gray-500 dark:text-gray-400">
                                  Voice Enabled
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === agent.agent_id
                                  ? null
                                  : agent.agent_id,
                              );
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                            title="More actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {openMenuId === agent.agent_id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                }}
                              />
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-200 rounded-lg shadow-lg border border-gray-200 dark:border-dark-100 py-1 z-20">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDuplicateAgent(agent);
                                  }}
                                  disabled={isDuplicating === agent.agent_id}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isDuplicating === agent.agent_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                  <span>Duplicate</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleExportAgent(agent, "json");
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 flex items-center space-x-2"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Export as JSON</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleExportAgent(agent, "csv");
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 flex items-center space-x-2"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Export as CSV</span>
                                </button>

                                <div className="h-px bg-gray-200 dark:bg-dark-100 my-1" />

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteAgent(agent.agent_id);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center space-x-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Agents;
