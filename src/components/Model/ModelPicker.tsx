import { useEffect, useState } from "react";
import { ChevronDown, Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ModelInfo } from "@/types";
import { useChatStore } from "@/store/use-chat-store";

export function ModelPicker() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { sessionID } = useChatStore();

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const { data } = await api.listModels();
        setModels(data);
      } catch (err) {
        console.error("Failed to load models:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleSelect = async (model: ModelInfo) => {
    if (!sessionID) return;
    try {
      await api.switchModel(sessionID, { id: model.id, providerID: model.providerID });
      setOpen(false);
    } catch (err) {
      console.error("Failed to switch model:", err);
    }
  };

  const currentModel = models.find(m => m.enabled && m.status === "active");

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Change model"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3.5 py-2 text-sm text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
      >
        <Sparkles className="size-4 text-accent" />
        <span className="font-medium">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : currentModel ? (
            currentModel.name
          ) : (
            "Select model"
          )}
        </span>
        <ChevronDown className="size-3.5 opacity-70" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-border-strong bg-surface shadow-lg overflow-hidden z-10">
          {loading ? (
            <div className="p-4 text-center text-sm text-foreground-muted">
              <Loader2 className="size-4 mx-auto animate-spin text-accent" />
            </div>
          ) : models.length === 0 ? (
            <div className="p-4 text-center text-sm text-foreground-muted">No models available</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {models
                .filter(m => m.enabled)
                .map((model) => (
                  <li key={model.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(model)}
                      className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-elevated"
                    >
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-foreground-muted">{model.providerID}</div>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
