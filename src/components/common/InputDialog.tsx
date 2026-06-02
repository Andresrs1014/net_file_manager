import { useState, useEffect, useRef } from 'react';

interface InputDialogProps {
  title: string;
  label: string;
  initialValue: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  validation?: (value: string) => string | null;
}

export function InputDialog({
  title,
  label,
  initialValue,
  placeholder,
  onConfirm,
  onCancel,
  validation,
}: InputDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('El nombre no puede estar vacío');
      return;
    }
    if (validation) {
      const validationError = validation(trimmed);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    onConfirm(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-[#262626] border border-[#404040] rounded-lg shadow-xl w-80">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#404040]">
          <h2 className="text-base font-medium text-[#e5e5e5]">{title}</h2>
        </div>

        {/* Content */}
        <div className="p-4">
          <label className="block text-sm text-[#a3a3a3] mb-2">{label}</label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full px-3 py-2 bg-[#1a1a1a] border rounded text-[#e5e5e5] outline-none transition-colors ${
              error ? 'border-[#ef4444]' : 'border-[#404040] focus:border-[#3b82f6]'
            }`}
          />
          {error && <p className="text-xs text-[#ef4444] mt-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#404040] flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#333] rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 text-sm bg-[#3b82f6] text-white rounded hover:bg-[#2563eb] transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}