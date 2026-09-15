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
      <p id="theme-description">지금의 기분에 맞는 색을 골라보세요.</p>
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
              <span className="theme-preview__check">
                <Check className="icon icon-sm" />
              </span>
            </span>
            <strong>{option.name}</strong>
            <span className="theme-option__description">
              {option.description}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
