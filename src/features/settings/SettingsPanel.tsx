import { ArrowLeft, ArrowUp, MoveVertical, Volume2 } from "lucide-react";
import { useEffect, useRef } from "react";

import type { AppSettings } from "@/domain/timer/timerTypes";

import { RangeSettings } from "./RangeSettings";
import { ThemeSettings } from "./ThemeSettings";

type SettingsPanelProps = {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
};

export function SettingsPanel({
  settings,
  onChange,
  onClose,
}: SettingsPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement) {
        opener.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="settings-panel"
      aria-labelledby="settings-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="settings-panel__header">
        <button
          className="icon-button"
          type="button"
          aria-label="타이머로 돌아가기"
          onClick={onClose}
        >
          <ArrowLeft className="icon icon-lg" />
        </button>
        <h1 id="settings-title">설정</h1>
        <span className="settings-save-note">자동 저장</span>
      </header>
      <div className="settings-content">
        <p className="settings-description">
          시간 범위와 화면 색상을 설정하세요.
        </p>
        <RangeSettings
          rangeMinutes={settings.rangeMinutes}
          onChange={(rangeMinutes) => onChange({ ...settings, rangeMinutes })}
        />
        <ThemeSettings
          theme={settings.theme}
          onChange={(theme) => onChange({ ...settings, theme })}
        />
        <section className="settings-guide" aria-labelledby="guide-title">
          <h2 id="guide-title">사용 방법</h2>
          <div>
            <span className="guide-icon">
              <ArrowUp className="icon" />
            </span>
            <p>
              <strong>위로 끌어 시작</strong>
              <span>시작 핀을 원하는 시간까지 올리고 놓으세요.</span>
            </p>
          </div>
          <div>
            <span className="guide-icon">
              <MoveVertical className="icon" />
            </span>
            <p>
              <strong>자유롭게 조정</strong>
              <span>
                실행 중인 타이머를 끌면 시간이 바뀌어요. 0까지 내리거나 탭해서
                조기 종료할 수 있어요.
              </span>
            </p>
          </div>
          <div>
            <span className="guide-icon">
              <Volume2 className="icon" />
            </span>
            <p>
              <strong>확인할 때까지 알림</strong>
              <span>앱을 열어두면 완료 알림이 반복돼요.</span>
            </p>
          </div>
        </section>
      </div>
    </dialog>
  );
}
