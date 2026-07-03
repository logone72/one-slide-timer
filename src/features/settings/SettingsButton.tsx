import { Settings } from "lucide-react";

type SettingsButtonProps = {
  onClick: () => void;
};

export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      aria-label="Open settings"
      className="settings-button"
      type="button"
      onClick={onClick}
    >
      <Settings aria-hidden="true" size={22} strokeWidth={2} />
    </button>
  );
}
