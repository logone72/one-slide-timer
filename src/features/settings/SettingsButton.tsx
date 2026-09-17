import { SlidersHorizontal } from "lucide-react";

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="설정 열기"
      className="settings-button icon-button"
      type="button"
      onClick={(event) => {
        event.currentTarget.focus();
        onClick();
      }}
    >
      <SlidersHorizontal aria-hidden="true" className="icon" />
      <span>설정</span>
    </button>
  );
}
