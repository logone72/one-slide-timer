import { Check } from "lucide-react";

import * as timerTypes from "@/domain/timer/timerTypes";

export function ThemeSettings({
  theme,
  onChange,
}: {
  theme: timerTypes.ThemeId;
  onChange: (theme: timerTypes.ThemeId) => void;
}) {
  return (
    <fieldset className="theme-settings" aria-describedby="theme-description">
      <legend>색상 테마</legend>
      <p id="theme-description">선택한 색상이 화면 전체에 바로 적용돼요.</p>
      <div className="theme-options">
        {timerTypes.THEMES.map((option) => (
          <label className="theme-option" key={option.id}>
            <input
              type="radio"
              name="theme"
              value={option.id}
              checked={theme === option.id}
              onChange={() => onChange(option.id)}
            />
            <span
              className="theme-preview"
              data-theme={option.id}
              aria-hidden="true"
            >
              <span className="theme-preview__rail" />
              <span className="theme-preview__timer">
                <i />
                <i />
              </span>
              <span className="theme-preview__start" />
            </span>
            <span className="theme-option__heading">
              <strong>{option.name}</strong>
              <Check
                className="icon icon-sm theme-option__check"
                aria-hidden="true"
              />
            </span>
            <span className="theme-option__description">
              {option.description}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
