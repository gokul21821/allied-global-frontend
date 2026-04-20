import { cn } from '../lib/utils';
import { modelOptions } from '../lib/constants';

interface ModelSelectProps {
  modelType: string;
  onChange: (value: string) => void;
  availableModels?: typeof modelOptions;
}

export const ModelSelect = ({ modelType, onChange, availableModels = modelOptions }: ModelSelectProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {availableModels.map((model) => (
        <button
          key={model.id}
          type="button"
          onClick={() => onChange(model.id)}
          className={cn(
            "p-4 rounded-xl border-2 text-left transition-all",
            modelType === model.id
              ? "border-primary bg-primary-50/50 dark:border-primary-400 dark:bg-primary-400/10"
              : "border-gray-200 dark:border-dark-100 hover:border-primary/50 dark:hover:border-primary-400/50"
          )}
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
  );
};