type ToggleSwitchProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  describedBy?: string;
  onChange: (checked: boolean) => void;
};

// 상태와 변경 동작은 호출자가 소유한다. 키보드·포커스 동작은 기본 checkbox를 따른다.
export function ToggleSwitch({
  label,
  checked,
  disabled,
  describedBy,
  onChange,
}: ToggleSwitchProps) {
  return (
    <label className="toggle-switch">
      <span>{label}</span>
      <span className="toggle-switch-state" aria-hidden="true">
        {checked ? "켜짐" : "꺼짐"}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        aria-describedby={describedBy}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
